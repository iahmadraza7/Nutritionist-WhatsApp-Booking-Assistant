import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { classifyIntent } from "@/lib/ai/intent-classifier";
import { generateOrganizationalResponse } from "@/lib/ai/organizational-response";
import { processBookingStep } from "@/lib/booking/state-machine";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { listAvailableSlots, createCalendarEvent } from "@/lib/calendar/google-calendar";
import { findFaqAnswer } from "@/lib/faq/matcher";
import type { Intent, BookingFlowState } from "@/lib/types";

export type ConversationChannel = "whatsapp" | "demo_web";

export interface ProcessIncomingMessageOptions {
  channel?: ConversationChannel;
  /**
   * Optional sender override. In demo mode, you can omit this to avoid sending real WhatsApp messages.
   */
  sendMessage?: (to: string, text: string) => Promise<boolean>;
}

export async function processIncomingMessage(
  patientPhone: string,
  patientName: string | null,
  messageText: string,
  options: ProcessIncomingMessageOptions = {}
): Promise<{ replies: string[]; conversationId: string }> {
  const channel = options.channel ?? "whatsapp";
  const sendFn = options.sendMessage ?? (channel === "whatsapp" ? sendWhatsAppMessage : async () => true);

  let patient = await prisma.patient.findUnique({ where: { phone: patientPhone } });
  if (!patient) {
    patient = await prisma.patient.create({
      data: { fullName: patientName ?? "Unknown", phone: patientPhone },
    });
  }

  let conv: { id: string; currentFlow: string | null; handoff: boolean; bookingData: unknown; lastMessageAt?: Date | null } | null =
    await prisma.conversation.findFirst({
      where: { patientId: patient.id },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true, currentFlow: true, handoff: true, bookingData: true, lastMessageAt: true },
    });

  if (!conv || isOlderThan(conv.lastMessageAt ?? null, 24)) {
    conv = await prisma.conversation.create({
      data: {
        patientId: patient.id,
        status: "ACTIVE",
        currentFlow: "idle",
        language: "it",
        handoff: false,
        lastMessageAt: new Date(),
      },
      select: { id: true, currentFlow: true, handoff: true, bookingData: true },
    });
  }

  if (!conv) return { replies: [], conversationId: "" };

  await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: "INBOUND",
      content: messageText,
      messageType: "text",
    },
  });

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date() },
  });

  if (conv.handoff) {
    return { replies: [], conversationId: conv.id };
  }

  const clinic = await prisma.clinicConfig.findFirst({ orderBy: { createdAt: "desc" } });
  const services = await prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } });

  const currentFlow = (conv.currentFlow ?? "idle") as BookingFlowState;
  const bookingData = (conv.bookingData as Record<string, unknown>) ?? null;

  const isInBookingFlow = [
    "awaiting_name",
    "awaiting_service",
    "awaiting_date",
    "awaiting_time",
    "awaiting_confirmation",
  ].includes(currentFlow);

  let intent: Intent = "OTHER";
  if (!isInBookingFlow) {
    const openai = process.env.OPENAI_API_KEY ? new OpenAI() : undefined;
    intent = await classifyIntent(messageText, openai);
  }

  const replies: string[] = [];

  if (intent === "MEDICAL_QUERY" || intent === "HUMAN_HANDOFF") {
    const fallback = clinic?.medicalFallbackMessage ?? "The doctor will reply to you shortly.";
    await sendFn(patientPhone, fallback);
    await saveOutboundMessage(conv.id, fallback);
    replies.push(fallback);
    await prisma.conversation.update({
      where: { id: conv.id },
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
        entityId: conv.id,
        meta: { intent },
      },
    });
    return { replies, conversationId: conv.id };
  }

  if (isInBookingFlow) {
    const bookingReplies = await handleBookingFlow(
      { id: conv.id, currentFlow: conv.currentFlow ?? "idle", bookingData: conv.bookingData },
      patientPhone,
      messageText,
      bookingData,
      services,
      sendFn,
      (clinic?.workingHours as Record<string, { open: string; close: string } | null> | undefined) ?? undefined
    );
    return { replies: bookingReplies, conversationId: conv.id };
  }

  if (intent === "BOOK_APPOINTMENT") {
    const bookingReplies = await handleBookingFlow(
      { id: conv.id, currentFlow: conv.currentFlow ?? "idle", bookingData: conv.bookingData },
      patientPhone,
      messageText,
      null,
      services,
      sendFn,
      (clinic?.workingHours as Record<string, { open: string; close: string } | null> | undefined) ?? undefined
    );
    return { replies: bookingReplies, conversationId: conv.id };
  }

  if (intent === "ORGANIZATIONAL" && clinic) {
    const faq = await findFaqAnswer(messageText, clinic.defaultLanguage ?? "it");
    if (faq) {
      await sendFn(patientPhone, faq);
      await saveOutboundMessage(conv.id, faq);
      replies.push(faq);
      return { replies, conversationId: conv.id };
    }

    const openai = new OpenAI();
    const context = {
      clinicName: clinic.clinicName,
      doctorName: clinic.doctorName,
      address: clinic.address ?? undefined,
      phone: clinic.phone ?? undefined,
      email: clinic.email ?? undefined,
      workingHours: (clinic.workingHours as Record<string, { open: string; close: string } | null>) ?? {},
      services: services.map((s) => ({ name: s.name, nameIt: s.nameIt ?? undefined })),
      cancellationPolicy: clinic.cancellationPolicy ?? undefined,
      defaultLanguage: clinic.defaultLanguage ?? "it",
    };
    const reply = await generateOrganizationalResponse(messageText, context, openai);
    await sendFn(patientPhone, reply);
    await saveOutboundMessage(conv.id, reply);
    replies.push(reply);
    return { replies, conversationId: conv.id };
  }

  if (intent === "CHECK_BOOKING" || intent === "RESCHEDULE_BOOKING" || intent === "CANCEL_BOOKING") {
    const reply =
      "Per modificare o controllare una prenotazione, la prego di contattare direttamente la clinica. Il dottore le risponderà a breve.";
    await sendFn(patientPhone, reply);
    await saveOutboundMessage(conv.id, reply);
    replies.push(reply);
    return { replies, conversationId: conv.id };
  }

  if (clinic) {
    const faq = await findFaqAnswer(messageText, clinic.defaultLanguage ?? "it");
    if (faq) {
      await sendFn(patientPhone, faq);
      await saveOutboundMessage(conv.id, faq);
      replies.push(faq);
      return { replies, conversationId: conv.id };
    }

    const openai = new OpenAI();
    const context = {
      clinicName: clinic.clinicName,
      doctorName: clinic.doctorName,
      address: clinic.address ?? undefined,
      phone: clinic.phone ?? undefined,
      email: clinic.email ?? undefined,
      workingHours: (clinic.workingHours as Record<string, { open: string; close: string } | null>) ?? {},
      services: services.map((s) => ({ name: s.name, nameIt: s.nameIt ?? undefined })),
      cancellationPolicy: clinic.cancellationPolicy ?? undefined,
      defaultLanguage: clinic.defaultLanguage ?? "it",
    };
    const reply = await generateOrganizationalResponse(messageText, context, openai);
    await sendFn(patientPhone, reply);
    await saveOutboundMessage(conv.id, reply);
    replies.push(reply);
  } else {
    const reply = "La prego di contattare la clinica per ulteriori informazioni.";
    await sendFn(patientPhone, reply);
    await saveOutboundMessage(conv.id, reply);
    replies.push(reply);
  }

  return { replies, conversationId: conv.id };
}

function isOlderThan(date: Date | null, hours: number): boolean {
  if (!date) return true;
  return Date.now() - date.getTime() > hours * 60 * 60 * 1000;
}

async function handleBookingFlow(
  conversation: { id: string; currentFlow: string; bookingData: unknown },
  patientPhone: string,
  messageText: string,
  bookingData: Record<string, unknown> | null,
  services: { id: string; name: string; nameIt: string | null; durationMin: number }[],
  sendFn: (to: string, text: string) => Promise<boolean>,
  workingHours?: Record<string, { open: string; close: string } | null>
) {
  const currentState = (conversation.currentFlow ?? "idle") as BookingFlowState;
  const data = bookingData ?? (conversation.bookingData as Record<string, unknown>);

  let availableSlots: string[] | undefined;
  if (currentState === "awaiting_time" && data?.date) {
    try {
      availableSlots = await listAvailableSlots(
        data.date as string,
        services.find((s) => s.id === data?.serviceId)?.durationMin ?? 60
        ,
        workingHours
      );
    } catch (e) {
      console.error("Calendar slots error:", e);
    }
  }

  const result = processBookingStep({
    currentState,
    bookingData: data as { name?: string; serviceId?: string; date?: string; time?: string; serviceName?: string },
    userMessage: messageText,
    services,
    availableSlots,
  });

  await sendFn(patientPhone, result.reply);
  await saveOutboundMessage(conversation.id, result.reply);

  const updateData: { currentFlow: string; bookingData?: Prisma.InputJsonValue } = {
    currentFlow: result.nextState,
    bookingData: result.bookingData as Prisma.InputJsonValue,
  };

  if (result.done && result.nextState === "booked") {
    try {
      const eventId = await createCalendarEvent(
        result.bookingData as { name?: string; date?: string; time?: string; serviceName?: string },
        patientPhone
      );
      const service = services.find((s) => s.id === result.bookingData.serviceId);
      const patient = await prisma.patient.findUnique({ where: { phone: patientPhone } });
      if (patient && service) {
        const [y, m, d] = (result.bookingData.date ?? "").split("-").map(Number);
        const [h, min] = (result.bookingData.time ?? "09:00").split(":").map(Number);
        const appointmentAt = new Date(y, m - 1, d, h, min, 0);

        const existing = await prisma.booking.findFirst({
          where: {
            patientId: patient.id,
            appointmentAt,
            status: "CONFIRMED",
          },
        });
        if (existing) {
          // Don't double-book locally; keep the conversation state reset.
        } else {
        await prisma.booking.create({
          data: {
            patientId: patient.id,
            serviceId: service.id,
            calendarEventId: eventId ?? undefined,
            appointmentAt,
            status: "CONFIRMED",
            source: "whatsapp",
          },
        });
        }
      }
    } catch (e) {
      console.error("Calendar create error:", e);
    }
    updateData.currentFlow = "idle";
    updateData.bookingData = {};
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: updateData,
  });

  return [result.reply];
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
