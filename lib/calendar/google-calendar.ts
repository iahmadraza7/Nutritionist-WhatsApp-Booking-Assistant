import { google } from "googleapis";
import type { BookingData } from "@/lib/types";

let oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

function getOAuthClient() {
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
    });
  }
  return oauth2Client;
}

export async function getCalendarClient() {
  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  return calendar;
}

export async function listAvailableSlots(
  date: string,
  durationMin: number = 60,
  workingHours?: Record<string, { open: string; close: string } | null>,
  excludeEventId?: string | null
): Promise<string[]> {
  const calendar = await getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][start.getDay()];
  const hours = workingHours?.[dayKey] ?? null;
  if (hours === null) return [];

  const [openH, openM] = (hours?.open ?? "09:00").split(":").map(Number);
  const [closeH, closeM] = (hours?.close ?? "18:00").split(":").map(Number);

  const response = await calendar.events.list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const busy: { start: Date; end: Date }[] = (response.data.items ?? [])
    .filter((e) => e.id !== excludeEventId)
    .map((e) => ({
      start: new Date(e.start?.dateTime ?? e.start?.date ?? 0),
      end: new Date(e.end?.dateTime ?? e.end?.date ?? 0),
    }));

  const slots: string[] = [];
  const workStartMin = openH * 60 + (openM || 0);
  const workEndMin = closeH * 60 + (closeM || 0);
  const intervalMin = 30;

  for (let t = workStartMin; t + durationMin <= workEndMin; t += intervalMin) {
      const slotStart = new Date(start);
      slotStart.setHours(Math.floor(t / 60), t % 60, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMin);

      if (slotEnd > end) continue;

      const overlaps = busy.some(
        (b) => slotStart < b.end && slotEnd > b.start
      );
      if (!overlaps) {
        const hh = slotStart.getHours().toString().padStart(2, "0");
        const mm = slotStart.getMinutes().toString().padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
  }

  return slots;
}

export async function createCalendarEvent(
  bookingData: BookingData,
  patientPhone: string,
  durationMin: number,
  sourceLabel: string
): Promise<string | null> {
  if (!bookingData.date || !bookingData.time || !bookingData.serviceName) {
    return null;
  }

  const calendar = await getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

  const [year, month, day] = bookingData.date.split("-").map(Number);
  const [hour, min] = bookingData.time.split(":").map(Number);

  const start = new Date(year, month - 1, day, hour, min, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMin);

  const event = {
    summary: `[${sourceLabel}] ${bookingData.serviceName} - ${bookingData.name}`,
    description: `Prenotazione da ${sourceLabel}\nPaziente: ${bookingData.name}\nTelefono WhatsApp: ${patientPhone}\nServizio: ${bookingData.serviceName}`,
    start: { dateTime: start.toISOString(), timeZone: process.env.TZ ?? "Europe/Rome" },
    end: { dateTime: end.toISOString(), timeZone: process.env.TZ ?? "Europe/Rome" },
  };

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return res.data.id ?? null;
}

export async function updateCalendarEvent(
  calendarEventId: string,
  bookingData: BookingData,
  patientPhone: string,
  durationMin: number,
  sourceLabel: string
): Promise<string | null> {
  if (!bookingData.date || !bookingData.time || !bookingData.serviceName || !calendarEventId) {
    return null;
  }

  const calendar = await getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

  const [year, month, day] = bookingData.date.split("-").map(Number);
  const [hour, min] = bookingData.time.split(":").map(Number);

  const start = new Date(year, month - 1, day, hour, min, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMin);

  const event = {
    summary: `[${sourceLabel}] ${bookingData.serviceName} - ${bookingData.name}`,
    description: `Prenotazione aggiornata da ${sourceLabel}\nPaziente: ${bookingData.name}\nTelefono WhatsApp: ${patientPhone}\nServizio: ${bookingData.serviceName}`,
    start: { dateTime: start.toISOString(), timeZone: process.env.TZ ?? "Europe/Rome" },
    end: { dateTime: end.toISOString(), timeZone: process.env.TZ ?? "Europe/Rome" },
  };

  const res = await calendar.events.update({
    calendarId,
    eventId: calendarEventId,
    requestBody: event,
  });

  return res.data.id ?? null;
}
