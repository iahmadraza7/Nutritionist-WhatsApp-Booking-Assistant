import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { classifyIntent } from "@/lib/ai/intent-classifier";
import { generateOrganizationalResponse } from "@/lib/ai/organizational-response";
import {
  formatDateForDisplay,
  processBookingStep,
  type BookingService,
} from "@/lib/booking/state-machine";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import {
  createCalendarEvent,
  listAvailableSlots,
  updateCalendarEvent,
} from "@/lib/calendar/google-calendar";
import { findFaqAnswer } from "@/lib/faq/matcher";
import { syncScheduledMessagesForBooking } from "@/lib/follow-up-scheduler";
import { formatPhoneForDisplay, normalizePhoneNumber } from "@/lib/phone";
import type {
  BookingChoice,
  BookingData,
  BookingFlowState,
  ConversationChannel,
  Intent,
  WorkingHours,
} from "@/lib/types";

type ConversationRecord = {
  id: string;
  patientId: string | null;
  channel: "WHATSAPP" | "WEB";
  sessionKey: string | null;
  currentFlow: string | null;
  handoff: boolean;
  bookingData: unknown;
  lastMessageAt?: Date | null;
};

export interface ProcessIncomingMessageOptions {
  channel?: ConversationChannel;
  sendMessage?: (to: string, text: string) => Promise<boolean>;
}

export async function processIncomingMessage(
  identityKey: string,
  patientName: string | null,
  messageText: string,
  options: ProcessIncomingMessageOptions = {}
): Promise<{ replies: string[]; conversationId: string }> {
  const channel = options.channel ?? "whatsapp";
  const sendFn =
    options.sendMessage ?? (channel === "whatsapp" ? sendWhatsAppMessage : async () => true);

  const conversation = await findOrCreateConversation(identityKey, patientName, channel);

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      content: messageText,
      messageType: "text",
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  if (conversation.handoff && channel === "whatsapp") {
    return { replies: [], conversationId: conversation.id };
  }

  const clinic = await prisma.clinicConfig.findFirst({ orderBy: { createdAt: "desc" } });
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  const currentFlow = (conversation.currentFlow ?? "idle") as BookingFlowState;
  const bookingData = ((conversation.bookingData as Record<string, unknown> | null) ??
    {}) as BookingData;

  const activeFlows: BookingFlowState[] = [
    "awaiting_name",
    "awaiting_contact",
    "awaiting_service",
    "awaiting_date",
    "awaiting_time",
    "awaiting_confirmation",
    "awaiting_reschedule_contact",
    "awaiting_reschedule_selection",
    "awaiting_reschedule_date",
    "awaiting_reschedule_time",
    "awaiting_reschedule_confirmation",
  ];

  const isInFlow = activeFlows.includes(currentFlow);
  let intent: Intent = "OTHER";

  if (!isInFlow) {
    const openai = process.env.OPENAI_API_KEY ? new OpenAI() : undefined;
    intent = await classifyIntent(messageText, openai);
  }

  if (intent === "MEDICAL_QUERY" || intent === "HUMAN_HANDOFF") {
    const fallback = getMedicalFallbackMessage(channel, clinic?.medicalFallbackMessage, clinic?.phone);
    await sendReply(conversation.id, fallback, channel === "whatsapp" ? identityKey : bookingData.phone, sendFn);

    if (channel === "whatsapp") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          handoff: true,
          status: "HANDOFF",
          currentFlow: "handoff",
          handoffReason: intent === "MEDICAL_QUERY" ? "MEDICAL_QUERY" : "MANUAL_REQUEST",
          handoffAt: new Date(),
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "HANDOFF_ENABLED",
          entity: "Conversation",
          entityId: conversation.id,
          meta: { intent, channel },
        },
      });
    }

    return { replies: [fallback], conversationId: conversation.id };
  }

  if (isInFlow) {
    const flowReplies = await handleConversationFlow({
      conversation,
      channel,
      identityKey,
      messageText,
      bookingData,
      services,
      sendFn,
      clinicPhone: clinic?.phone ?? null,
      workingHours:
        (clinic?.workingHours as Record<string, { open: string; close: string } | null> | undefined) ??
        undefined,
      patientName,
    });
    return { replies: flowReplies, conversationId: conversation.id };
  }

  if (intent === "BOOK_APPOINTMENT") {
    const result = processBookingStep({
      currentState: "idle",
      bookingData,
      userMessage: messageText,
      services: services as BookingService[],
    });
    await updateConversationState(conversation.id, result.nextState, result.bookingData);
    await sendReply(conversation.id, result.reply, bookingData.phone ?? identityKey, sendFn);
    return { replies: [result.reply], conversationId: conversation.id };
  }

  if (intent === "RESCHEDULE_BOOKING" || intent === "CHECK_BOOKING") {
    const reply =
      "Per spostare un appuntamento, inserisca il numero WhatsApp usato per la prenotazione.";
    await updateConversationState(conversation.id, "awaiting_reschedule_contact", bookingData);
    await sendReply(conversation.id, reply, bookingData.phone ?? identityKey, sendFn);
    return { replies: [reply], conversationId: conversation.id };
  }

  if (intent === "CANCEL_BOOKING") {
    const reply = getCancellationReply(clinic?.phone ?? null);
    await sendReply(conversation.id, reply, bookingData.phone ?? identityKey, sendFn);
    return { replies: [reply], conversationId: conversation.id };
  }

  const organizationalReply = await handleOrganizationalMessage(
    messageText,
    clinic
      ? {
          clinicName: clinic.clinicName,
          doctorName: clinic.doctorName,
          address: clinic.address ?? undefined,
          phone: clinic.phone ?? undefined,
          email: clinic.email ?? undefined,
          workingHours:
            (clinic.workingHours as Record<string, { open: string; close: string } | null>) ?? {},
          services: services.map((s) => ({ name: s.name, nameIt: s.nameIt ?? undefined })),
          cancellationPolicy: clinic.cancellationPolicy ?? undefined,
          defaultLanguage: clinic.defaultLanguage ?? "it",
        }
      : null
  );

  await sendReply(
    conversation.id,
    organizationalReply,
    bookingData.phone ?? identityKey,
    sendFn
  );
  return { replies: [organizationalReply], conversationId: conversation.id };
}

async function handleConversationFlow({
  conversation,
  channel,
  identityKey,
  messageText,
  bookingData,
  services,
  sendFn,
  clinicPhone,
  workingHours,
  patientName,
}: {
  conversation: ConversationRecord;
  channel: ConversationChannel;
  identityKey: string;
  messageText: string;
  bookingData: BookingData;
  services: BookingService[];
  sendFn: (to: string, text: string) => Promise<boolean>;
  clinicPhone: string | null;
  workingHours?: WorkingHours;
  patientName: string | null;
}) {
  const currentState = (conversation.currentFlow ?? "idle") as BookingFlowState;
  const data = { ...bookingData };

  if (currentState === "awaiting_contact") {
    const normalizedPhone = normalizePhoneNumber(messageText);
    if (!normalizedPhone) {
      const reply =
        "Numero non valido. Inserisca il numero WhatsApp completo, ad esempio +39 333 123 4567.";
      await sendReply(conversation.id, reply, identityKey, sendFn);
      return [reply];
    }

    data.phone = normalizedPhone;
    await attachConversationToPatient(conversation, normalizedPhone, data.name ?? patientName ?? "Paziente");
    const reply = `Perfetto. Scelga ora il tipo di appuntamento:\n${services
      .map((service) => `• ${service.nameIt ?? service.name}`)
      .join("\n")}`;
    await updateConversationState(conversation.id, "awaiting_service", data);
    await sendReply(conversation.id, reply, data.phone, sendFn);
    return [reply];
  }

  if (currentState === "awaiting_reschedule_contact") {
    const normalizedPhone = normalizePhoneNumber(messageText);
    if (!normalizedPhone) {
      const reply =
        "Numero non valido. Inserisca il numero WhatsApp usato per la prenotazione, incluso prefisso.";
      await sendReply(conversation.id, reply, identityKey, sendFn);
      return [reply];
    }

    data.phone = normalizedPhone;
    const patient = await attachConversationToPatient(
      conversation,
      normalizedPhone,
      patientName ?? "Paziente"
    );
    const futureBookings = await getFutureBookingsByPhone(normalizedPhone);

    if (futureBookings.length === 0) {
      const reply = `Non ho trovato appuntamenti futuri associati a ${formatPhoneForDisplay(
        normalizedPhone
      )}. ${getCancellationReply(clinicPhone)}`;
      await updateConversationState(conversation.id, "idle", {});
      await sendReply(conversation.id, reply, normalizedPhone, sendFn);
      return [reply];
    }

    if (patient && !patient.fullName && patientName) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { fullName: patientName },
      });
    }

    if (futureBookings.length === 1) {
      const selected = futureBookings[0];
      const nextData: BookingData = {
        ...data,
        selectedBookingId: selected.id,
        selectedBookingLabel: selected.label,
        selectedBookingServiceId: selected.serviceId,
        selectedBookingServiceName: selected.serviceName,
        rescheduleOptions: futureBookings,
      };
      const reply = `Ho trovato questo appuntamento:\n${selected.label}\n\nQuale nuova data desidera?`;
      await updateConversationState(conversation.id, "awaiting_reschedule_date", nextData);
      await sendReply(conversation.id, reply, normalizedPhone, sendFn);
      return [reply];
    }

    const nextData: BookingData = {
      ...data,
      rescheduleOptions: futureBookings,
    };
    const reply = `Ho trovato questi appuntamenti futuri:\n${futureBookings
      .map((booking, index) => `${index + 1}. ${booking.label}`)
      .join("\n")}\n\nRisponda con il numero dell'appuntamento che vuole spostare.`;
    await updateConversationState(conversation.id, "awaiting_reschedule_selection", nextData);
    await sendReply(conversation.id, reply, normalizedPhone, sendFn);
    return [reply];
  }

  let availableSlots: string[] | undefined;
  if (currentState === "awaiting_time" && data.date && data.serviceId) {
    const service = services.find((item) => item.id === data.serviceId);
    if (service) {
      availableSlots = await listAvailableSlots(data.date, service.durationMin, workingHours);
    }
  }

  if (currentState === "awaiting_reschedule_time" && data.date && data.selectedBookingId) {
    const selectedBooking = await prisma.booking.findUnique({
      where: { id: data.selectedBookingId },
      include: { service: true },
    });
    if (selectedBooking) {
      availableSlots = await listAvailableSlots(
        data.date,
        selectedBooking.service.durationMin,
        workingHours,
        selectedBooking.calendarEventId
      );
    }
  }

  const result = processBookingStep({
    currentState,
    bookingData: data,
    userMessage: messageText,
    services,
    availableSlots,
  });

  if (result.done && result.nextState === "booked") {
    const bookingReply = await finalizeBooking({
      conversation,
      bookingData: result.bookingData,
      services,
      channel,
    });
    await updateConversationState(conversation.id, "idle", {});
    await sendReply(
      conversation.id,
      bookingReply,
      result.bookingData.phone ?? identityKey,
      sendFn
    );
    return [bookingReply];
  }

  if (result.done && result.nextState === "rescheduled") {
    const rescheduleReply = await finalizeReschedule({
      bookingData: result.bookingData,
      channel,
    });
    await updateConversationState(conversation.id, "idle", {});
    await sendReply(
      conversation.id,
      rescheduleReply,
      result.bookingData.phone ?? identityKey,
      sendFn
    );
    return [rescheduleReply];
  }

  await updateConversationState(conversation.id, result.nextState, result.bookingData);
  await sendReply(conversation.id, result.reply, result.bookingData.phone ?? identityKey, sendFn);
  return [result.reply];
}

async function finalizeBooking({
  conversation,
  bookingData,
  services,
  channel,
}: {
  conversation: ConversationRecord;
  bookingData: BookingData;
  services: BookingService[];
  channel: ConversationChannel;
}) {
  if (!bookingData.phone || !bookingData.name || !bookingData.serviceId || !bookingData.date || !bookingData.time) {
    return "Non sono riuscito a completare la prenotazione. Per favore riprovi.";
  }

  const patient = await attachConversationToPatient(conversation, bookingData.phone, bookingData.name);
  if (!patient) {
    return "Non sono riuscito a salvare i dati del paziente. Per favore riprovi.";
  }

  const service = services.find((item) => item.id === bookingData.serviceId);
  if (!service) {
    return "Il servizio selezionato non è disponibile. Per favore riprovi.";
  }

  const appointmentAt = dateAndTimeToDate(bookingData.date, bookingData.time);
  const existing = await prisma.booking.findFirst({
    where: {
      patientId: patient.id,
      appointmentAt,
      status: "CONFIRMED",
    },
  });

  if (existing) {
    return "Esiste già una prenotazione confermata per questo orario. Scelga un altro slot.";
  }

  let eventId: string | null = null;
  try {
    eventId = await createCalendarEvent(
      bookingData,
      bookingData.phone,
      service.durationMin,
      channel === "web" ? "Web Chat" : "WhatsApp"
    );
  } catch (error) {
    console.error("Calendar create error:", error);
  }

  const booking = await prisma.booking.create({
    data: {
      patientId: patient.id,
      serviceId: service.id,
      calendarEventId: eventId ?? undefined,
      appointmentAt,
      status: "CONFIRMED",
      source: channel,
    },
  });

  await syncScheduledMessagesForBooking(booking.id);

  return `Prenotazione confermata per ${service.nameIt ?? service.name} il ${formatDateForDisplay(
    bookingData.date
  )} alle ${bookingData.time}. Riceverà un promemoria su WhatsApp.`;
}

async function finalizeReschedule({
  bookingData,
  channel,
}: {
  bookingData: BookingData;
  channel: ConversationChannel;
}) {
  if (!bookingData.selectedBookingId || !bookingData.date || !bookingData.time || !bookingData.phone) {
    return "Non sono riuscito a spostare l'appuntamento. Per favore riprovi.";
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingData.selectedBookingId },
    include: {
      patient: true,
      service: true,
    },
  });

  if (!booking || booking.status !== "CONFIRMED") {
    return "Non ho trovato un appuntamento valido da spostare.";
  }

  if ((booking.patient.phone ?? "") !== bookingData.phone) {
    return "Il numero indicato non corrisponde alla prenotazione selezionata.";
  }

  const appointmentAt = dateAndTimeToDate(bookingData.date, bookingData.time);
  const conflict = await prisma.booking.findFirst({
    where: {
      patientId: booking.patientId,
      appointmentAt,
      status: "CONFIRMED",
      id: { not: booking.id },
    },
  });
  if (conflict) {
    return "Esiste già un altro appuntamento confermato per questo orario.";
  }

  try {
    if (booking.calendarEventId) {
      await updateCalendarEvent(
        booking.calendarEventId,
        {
          ...bookingData,
          serviceName: booking.service.nameIt ?? booking.service.name,
          name: booking.patient.fullName,
        },
        bookingData.phone,
        booking.service.durationMin,
        channel === "web" ? "Web Chat" : "WhatsApp"
      );
    } else {
      const newEventId = await createCalendarEvent(
        {
          ...bookingData,
          serviceName: booking.service.nameIt ?? booking.service.name,
          name: booking.patient.fullName,
        },
        bookingData.phone,
        booking.service.durationMin,
        channel === "web" ? "Web Chat" : "WhatsApp"
      );
      await prisma.booking.update({
        where: { id: booking.id },
        data: { calendarEventId: newEventId ?? undefined },
      });
    }
  } catch (error) {
    console.error("Calendar update error:", error);
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      appointmentAt,
    },
  });

  await syncScheduledMessagesForBooking(booking.id);

  return `Appuntamento spostato a ${formatDateForDisplay(bookingData.date)} alle ${bookingData.time}. Riceverà un nuovo promemoria su WhatsApp.`;
}

async function handleOrganizationalMessage(
  messageText: string,
  clinic:
    | {
        clinicName: string;
        doctorName: string;
        address?: string;
        phone?: string;
        email?: string;
        workingHours: Record<string, { open: string; close: string } | null>;
        services: { name: string; nameIt?: string }[];
        cancellationPolicy?: string;
        defaultLanguage: string;
      }
    | null
) {
  if (!clinic) {
    return "La prego di contattare la clinica per ulteriori informazioni.";
  }

  const faq = await findFaqAnswer(messageText, clinic.defaultLanguage ?? "it");
  if (faq) return faq;

  if (!process.env.OPENAI_API_KEY) {
    return basicOrganizationalFallback(messageText, clinic);
  }

  const openai = new OpenAI();
  return generateOrganizationalResponse(messageText, clinic, openai);
}

async function findOrCreateConversation(
  identityKey: string,
  patientName: string | null,
  channel: ConversationChannel
): Promise<ConversationRecord> {
  if (channel === "whatsapp") {
    const normalizedPhone = normalizePhoneNumber(identityKey) ?? identityKey.replace(/\D/g, "");
    let patient = await prisma.patient.findUnique({ where: { phone: normalizedPhone } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          fullName: patientName ?? "Unknown",
          phone: normalizedPhone,
        },
      });
    } else if (patientName && patient.fullName === "Unknown") {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: { fullName: patientName },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        patientId: patient.id,
        channel: "WHATSAPP",
      },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        patientId: true,
        channel: true,
        sessionKey: true,
        currentFlow: true,
        handoff: true,
        bookingData: true,
        lastMessageAt: true,
      },
    });

    if (!conversation || isOlderThan(conversation.lastMessageAt ?? null, 24)) {
      conversation = await prisma.conversation.create({
        data: {
          patientId: patient.id,
          channel: "WHATSAPP",
          status: "ACTIVE",
          currentFlow: "idle",
          language: "it",
          handoff: false,
          lastMessageAt: new Date(),
        },
        select: {
          id: true,
          patientId: true,
          channel: true,
          sessionKey: true,
          currentFlow: true,
          handoff: true,
          lastMessageAt: true,
          bookingData: true,
        },
      });
    }

    return conversation;
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      channel: "WEB",
      sessionKey: identityKey,
    },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      patientId: true,
      channel: true,
      sessionKey: true,
      currentFlow: true,
      handoff: true,
      bookingData: true,
      lastMessageAt: true,
    },
  });

  if (!conversation || isOlderThan(conversation.lastMessageAt ?? null, 24)) {
    conversation = await prisma.conversation.create({
      data: {
        channel: "WEB",
        sessionKey: identityKey,
        status: "ACTIVE",
        currentFlow: "idle",
        language: "it",
        handoff: false,
        lastMessageAt: new Date(),
      },
      select: {
        id: true,
        patientId: true,
        channel: true,
        sessionKey: true,
        currentFlow: true,
        handoff: true,
        lastMessageAt: true,
        bookingData: true,
      },
    });
  }

  return conversation;
}

async function attachConversationToPatient(
  conversation: ConversationRecord,
  phone: string,
  name: string
) {
  let patient = await prisma.patient.findUnique({ where: { phone } });
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        fullName: name,
        phone,
      },
    });
  } else if (name && patient.fullName !== name && patient.fullName === "Unknown") {
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: { fullName: name },
    });
  }

  if (conversation.patientId !== patient.id) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        patientId: patient.id,
      },
    });
  }

  return patient;
}

async function getFutureBookingsByPhone(phone: string): Promise<BookingChoice[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      appointmentAt: { gte: new Date() },
      patient: {
        phone,
      },
    },
    include: {
      service: true,
    },
    orderBy: { appointmentAt: "asc" },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    label: `${booking.service.nameIt ?? booking.service.name} - ${booking.appointmentAt.toLocaleString(
      "it-IT"
    )}`,
    serviceId: booking.serviceId,
    serviceName: booking.service.nameIt ?? booking.service.name,
  }));
}

async function sendReply(
  conversationId: string,
  content: string,
  destination: string | null | undefined,
  sendFn: (to: string, text: string) => Promise<boolean>
) {
  if (destination) {
    await sendFn(destination, content);
  }
  await saveOutboundMessage(conversationId, content);
}

async function saveOutboundMessage(conversationId: string, content: string) {
  await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      content,
      messageType: "text",
    },
  });
}

async function updateConversationState(
  conversationId: string,
  currentFlow: BookingFlowState,
  bookingData: BookingData
) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      currentFlow,
      bookingData: bookingData as Prisma.InputJsonValue,
      handoff: false,
      status: "ACTIVE",
      handoffAt: null,
      handoffReason: null,
    },
  });
}

function getMedicalFallbackMessage(
  channel: ConversationChannel,
  defaultMessage: string | null | undefined,
  clinicPhone: string | null | undefined
) {
  if (channel === "whatsapp") {
    return defaultMessage ?? "Il dottore le risponderà a breve.";
  }

  if (clinicPhone) {
    return `Per domande tecniche o mediche, scriva direttamente al dottore su WhatsApp al ${formatPhoneForDisplay(
      clinicPhone
    )}.`;
  }

  return "Per domande tecniche o mediche, contatti direttamente il dottore su WhatsApp.";
}

function getCancellationReply(clinicPhone: string | null) {
  if (clinicPhone) {
    return `Per annullare o gestire manualmente una prenotazione, contatti direttamente la clinica al ${formatPhoneForDisplay(
      clinicPhone
    )}.`;
  }

  return "Per annullare o gestire manualmente una prenotazione, contatti direttamente la clinica.";
}

function basicOrganizationalFallback(
  userMessage: string,
  clinic: {
    clinicName: string;
    doctorName: string;
    address?: string;
    phone?: string;
    email?: string;
    workingHours: Record<string, { open: string; close: string } | null>;
    services: { name: string; nameIt?: string }[];
    cancellationPolicy?: string;
    defaultLanguage: string;
  }
) {
  const normalized = userMessage.toLowerCase();
  if (normalized.includes("orari")) {
    return `Gli orari sono: Lun-Ven ${clinic.workingHours.mon?.open ?? "15:00"}-${
      clinic.workingHours.mon?.close ?? "19:00"
    }. Sabato e domenica chiuso.`;
  }
  if (normalized.includes("indirizzo") || normalized.includes("dove")) {
    return clinic.address
      ? `Lo studio si trova in ${clinic.address}.`
      : "L'indirizzo sarà comunicato direttamente dalla clinica.";
  }
  if (normalized.includes("telefono") || normalized.includes("whatsapp")) {
    return clinic.phone
      ? `Può contattare la clinica al ${formatPhoneForDisplay(clinic.phone)}.`
      : "Può contattare direttamente la clinica per assistenza.";
  }
  return `Posso aiutarla con prenotazioni, spostamenti appuntamento, orari e informazioni organizzative di ${clinic.clinicName}.`;
}

function dateAndTimeToDate(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

function isOlderThan(date: Date | null, hours: number): boolean {
  if (!date) return true;
  return Date.now() - date.getTime() > hours * 60 * 60 * 1000;
}
