import { prisma } from "@/lib/db";
import type {
  FollowUpOffsetDirection,
  FollowUpOffsetUnit,
  FollowUpServiceScope,
} from "@/lib/types";

type TemplateLike = {
  id: string;
  messageIt: string;
  offsetDirection: string;
  offsetValue: number;
  offsetUnit: string;
  serviceScope: string;
};

type BookingWithRelations = {
  id: string;
  appointmentAt: Date;
  status: string;
  patient: { fullName: string; phone: string | null };
  service: { name: string; nameIt: string | null; serviceType: string };
};

export function offsetToMinutes(value: number, unit: FollowUpOffsetUnit): number {
  if (unit === "MINUTES") return value;
  if (unit === "HOURS") return value * 60;
  return value * 24 * 60;
}

export function isTemplateApplicable(serviceType: string, scope: FollowUpServiceScope): boolean {
  if (scope === "ALL") return true;
  return serviceType === "FIRST_VISIT";
}

export function computeScheduledFor(
  appointmentAt: Date,
  offsetValue: number,
  offsetUnit: FollowUpOffsetUnit,
  offsetDirection: FollowUpOffsetDirection
): Date {
  const minutes = offsetToMinutes(offsetValue, offsetUnit);
  const scheduledFor = new Date(appointmentAt);
  scheduledFor.setMinutes(
    scheduledFor.getMinutes() + (offsetDirection === "BEFORE" ? -minutes : minutes)
  );
  return scheduledFor;
}

export function renderTemplateMessage(
  message: string,
  booking: BookingWithRelations,
  timezone: string
): string {
  const serviceName = booking.service.nameIt ?? booking.service.name;
  const appointmentDate = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).format(booking.appointmentAt);
  const appointmentTime = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(booking.appointmentAt);

  return message
    .replace(/\{\{\s*patient_name\s*\}\}/gi, booking.patient.fullName)
    .replace(/\{\{\s*appointment_date\s*\}\}/gi, appointmentDate)
    .replace(/\{\{\s*appointment_time\s*\}\}/gi, appointmentTime)
    .replace(/\{\{\s*service_name\s*\}\}/gi, serviceName);
}

export async function syncScheduledMessagesForBooking(bookingId: string) {
  const now = new Date();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      patient: true,
      service: true,
    },
  });

  if (!booking) return;

  await prisma.scheduledMessage.updateMany({
    where: {
      bookingId,
      status: "PENDING",
      scheduledFor: { gt: now },
    },
    data: {
      status: "CANCELLED",
    },
  });

  if (booking.status !== "CONFIRMED" || !booking.patient.phone) {
    return;
  }

  const templates = await prisma.followUpTemplate.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  const clinic = await prisma.clinicConfig.findFirst({
    orderBy: { createdAt: "desc" },
    select: { timezone: true },
  });
  const timezone = clinic?.timezone ?? "Europe/Rome";

  for (const template of templates) {
    if (
      !isTemplateApplicable(
        booking.service.serviceType,
        (template.serviceScope as FollowUpServiceScope) ?? "ALL"
      )
    ) {
      continue;
    }

    const scheduledFor = computeScheduledFor(
      booking.appointmentAt,
      template.offsetValue,
      (template.offsetUnit as FollowUpOffsetUnit) ?? "HOURS",
      (template.offsetDirection as FollowUpOffsetDirection) ?? "BEFORE"
    );

    if (scheduledFor <= now) {
      continue;
    }

    await prisma.scheduledMessage.create({
      data: {
        bookingId: booking.id,
        templateId: template.id,
        patientPhone: booking.patient.phone,
        content: renderTemplateMessage(template.messageIt, booking, timezone),
        scheduledFor,
        status: "PENDING",
      },
    });
  }
}

export async function syncScheduledMessagesForActiveBookings(referenceTime: Date = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      appointmentAt: {
        gte: new Date(referenceTime.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true },
  });

  for (const booking of bookings) {
    await syncScheduledMessagesForBooking(booking.id);
  }
}
