import cron from "node-cron";
import { prisma } from "../lib/db";
import { sendWhatsAppMessage } from "../lib/whatsapp/client";

async function processScheduledMessages() {
  const now = new Date();
  const pending = await prisma.scheduledMessage.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
    },
    take: 50,
  });

  for (const msg of pending) {
    try {
      const sent = await sendWhatsAppMessage(msg.patientPhone, msg.content);
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: {
          status: sent ? "SENT" : "FAILED",
          sentAt: sent ? new Date() : undefined,
        },
      });
    } catch (e) {
      console.error("Scheduled message send error:", e);
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED" },
      });
    }
  }
}

async function scheduleFollowUps() {
  const templates = await prisma.followUpTemplate.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      appointmentAt: { gte: new Date() },
    },
    include: { patient: true },
  });

  for (const booking of upcomingBookings) {
    const patient = booking.patient;
    const apt = booking.appointmentAt;

    for (const tpl of templates) {
      let scheduledFor: Date | null = null;
      if (tpl.trigger === "BEFORE_24H") {
        scheduledFor = new Date(apt);
        scheduledFor.setHours(scheduledFor.getHours() - 24);
      } else if (tpl.trigger === "BEFORE_2H") {
        scheduledFor = new Date(apt);
        scheduledFor.setHours(scheduledFor.getHours() - 2);
      }

      if (scheduledFor && scheduledFor > new Date()) {
        const exists = await prisma.scheduledMessage.findFirst({
          where: {
            bookingId: booking.id,
            templateId: tpl.id,
            status: { in: ["PENDING", "SENT"] },
          },
        });
        if (!exists) {
          await prisma.scheduledMessage.create({
            data: {
              bookingId: booking.id,
              templateId: tpl.id,
              patientPhone: patient.phone,
              content: tpl.messageIt,
              scheduledFor,
              status: "PENDING",
            },
          });
        }
      }
    }
  }

  const pastBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      appointmentAt: { lt: new Date() },
    },
    include: { patient: true },
  });

  for (const booking of pastBookings) {
    const patient = booking.patient;
    const apt = booking.appointmentAt;

    for (const tpl of templates) {
      let scheduledFor: Date | null = null;
      if (tpl.trigger === "AFTER_1D") {
        scheduledFor = new Date(apt);
        scheduledFor.setDate(scheduledFor.getDate() + 1);
      } else if (tpl.trigger === "AFTER_3D") {
        scheduledFor = new Date(apt);
        scheduledFor.setDate(scheduledFor.getDate() + 3);
      }

      if (scheduledFor && scheduledFor > new Date()) {
        const exists = await prisma.scheduledMessage.findFirst({
          where: {
            bookingId: booking.id,
            templateId: tpl.id,
            status: { in: ["PENDING", "SENT"] },
          },
        });
        if (!exists) {
          await prisma.scheduledMessage.create({
            data: {
              bookingId: booking.id,
              templateId: tpl.id,
              patientPhone: patient.phone,
              content: tpl.messageIt,
              scheduledFor,
              status: "PENDING",
            },
          });
        }
      }
    }
  }
}

function run() {
  console.log("Scheduler started");
  cron.schedule("* * * * *", processScheduledMessages);
  cron.schedule("0 * * * *", scheduleFollowUps);
  processScheduledMessages().catch(console.error);
  scheduleFollowUps().catch(console.error);
}

run();
