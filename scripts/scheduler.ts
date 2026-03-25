import cron from "node-cron";
import { prisma } from "../lib/db";
import { sendWhatsAppMessage } from "../lib/whatsapp/client";
import { syncScheduledMessagesForActiveBookings } from "../lib/follow-up-scheduler";

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

function run() {
  console.log("Scheduler started");
  cron.schedule("* * * * *", processScheduledMessages);
  cron.schedule("0 * * * *", () => syncScheduledMessagesForActiveBookings().catch(console.error));
  processScheduledMessages().catch(console.error);
  syncScheduledMessagesForActiveBookings().catch(console.error);
}

run();
