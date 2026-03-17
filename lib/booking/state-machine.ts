import type { BookingData, BookingFlowState } from "@/lib/types";

export interface BookingService {
  id: string;
  name: string;
  nameIt: string | null;
  durationMin: number;
}

export interface BookingStateMachineInput {
  currentState: BookingFlowState;
  bookingData: BookingData | null;
  userMessage: string;
  services: BookingService[];
  availableSlots?: string[];
}

export interface BookingStateMachineOutput {
  nextState: BookingFlowState;
  bookingData: BookingData;
  reply: string;
  done?: boolean;
}

const DAYS_IT: Record<string, string> = {
  lun: "lunedì", mar: "martedì", mer: "mercoledì", gio: "giovedì",
  ven: "venerdì", sab: "sabato", dom: "domenica",
};

const DOW_MAP_IT: Array<{ keys: string[]; dow: number }> = [
  { keys: ["lunedì", "lunedi", "lun"], dow: 1 },
  { keys: ["martedì", "martedi", "mar"], dow: 2 },
  { keys: ["mercoledì", "mercoledi", "mer"], dow: 3 },
  { keys: ["giovedì", "giovedi", "gio"], dow: 4 },
  { keys: ["venerdì", "venerdi", "ven"], dow: 5 },
  { keys: ["sabato", "sab"], dow: 6 },
  { keys: ["domenica", "dom"], dow: 0 },
];

function formatDateForDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function parseDate(input: string): Date | null {
  const lower = input.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lower.includes("domani") || lower.includes("tomorrow")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (lower.includes("dopodomani")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (lower.includes("prossim") || lower.includes("next week")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }

  // Next weekday (Italian)
  const dowMatch = DOW_MAP_IT.find((d) => d.keys.some((k) => lower.includes(k)));
  if (dowMatch) {
    const d = new Date(today);
    const current = d.getDay();
    const delta = (dowMatch.dow - current + 7) % 7 || 7; // next occurrence, not today
    d.setDate(d.getDate() + delta);
    return d;
  }

  const ddmmyy = input.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (ddmmyy) {
    const [, day, month, year] = ddmmyy;
    const y = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
    const d = new Date(y, parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(d.getTime())) return d;
  }

  const iso = new Date(input);
  if (!isNaN(iso.getTime())) return iso;

  return null;
}

function parseTime(input: string): string | null {
  const m = input.match(/(\d{1,2})[:\s]*(\d{2})?\s*(?:am|pm)?/i) ?? input.match(/(\d{1,2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (input.toLowerCase().includes("pm") && h < 12) h += 12;
  if (input.toLowerCase().includes("am") && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

export function processBookingStep(input: BookingStateMachineInput): BookingStateMachineOutput {
  const { currentState, bookingData, userMessage, services, availableSlots } = input;
  const data: BookingData = { ...(bookingData ?? {}) };

  switch (currentState) {
    case "idle":
      return {
        nextState: "awaiting_name",
        bookingData: data,
        reply: "Certo! Per prenotare un appuntamento, mi serve il suo nome completo.",
      };

    case "awaiting_name": {
      const name = userMessage.trim();
      if (name.length < 2) {
        return {
          nextState: "awaiting_name",
          bookingData: data,
          reply: "Per favore, inserisca il suo nome completo.",
        };
      }
      data.name = name;
      const serviceList = services.map((s) => `• ${s.nameIt ?? s.name}`).join("\n");
      return {
        nextState: "awaiting_service",
        bookingData: data,
        reply: `Grazie ${name}. Quale tipo di visita desidera?\n\n${serviceList}`,
      };
    }

    case "awaiting_service": {
      const msg = userMessage.toLowerCase().trim();
      const match = services.find(
        (s) =>
          (s.nameIt ?? s.name).toLowerCase().includes(msg) ||
          msg.includes((s.nameIt ?? s.name).toLowerCase())
      );
      if (!match) {
        const list = services.map((s) => s.nameIt ?? s.name).join(", ");
        return {
          nextState: "awaiting_service",
          bookingData: data,
          reply: `Non ho riconosciuto il servizio. Scegli tra: ${list}`,
        };
      }
      data.serviceId = match.id;
      data.serviceName = match.nameIt ?? match.name;
      return {
        nextState: "awaiting_date",
        bookingData: data,
        reply: `Perfetto, ${data.serviceName}. In quale data preferisce l'appuntamento? (es. domani, 15/03/2025)`,
      };
    }

    case "awaiting_date": {
      const date = parseDate(userMessage);
      if (!date || date < new Date(new Date().setHours(0, 0, 0, 0))) {
        return {
          nextState: "awaiting_date",
          bookingData: data,
          reply: "Data non valida. Inserisca una data futura (es. domani, 20/03/2025).",
        };
      }
      data.date = date.toISOString().split("T")[0];
      return {
        nextState: "awaiting_time",
        bookingData: data,
        reply: `Ottimo, ${formatDateForDisplay(data.date)}. A che ora preferisce? (es. 10:00, 14:30)`,
      };
    }

    case "awaiting_time": {
      const time = parseTime(userMessage);
      if (!time) {
        return {
          nextState: "awaiting_time",
          bookingData: data,
          reply: "Ora non valida. Inserisca un orario (es. 10:00 o 14:30).",
        };
      }
      data.time = time;

      if (availableSlots && availableSlots.length > 0 && !availableSlots.includes(time)) {
        return {
          nextState: "awaiting_time",
          bookingData: data,
          reply: `L'orario ${time} non è disponibile. Orari disponibili: ${availableSlots.join(", ")}`,
        };
      }

      const summary = `${data.serviceName} - ${formatDateForDisplay(data.date!)} alle ${time}`;
      return {
        nextState: "awaiting_confirmation",
        bookingData: data,
        reply: `Riepilogo:\n${summary}\n\nConferma la prenotazione? (sì/no)`,
      };
    }

    case "awaiting_confirmation": {
      const confirm = userMessage.toLowerCase().trim();
      if (confirm.startsWith("s") || confirm === "si" || confirm === "yes" || confirm === "y") {
        return {
          nextState: "booked",
          bookingData: data,
          reply: "Prenotazione confermata! Riceverà un promemoria prima dell'appuntamento.",
          done: true,
        };
      }
      if (confirm.startsWith("n") || confirm === "no") {
        return {
          nextState: "idle",
          bookingData: {},
          reply: "Prenotazione annullata. Se vuole riprovare, scriva 'prenotare'.",
        };
      }
      return {
        nextState: "awaiting_confirmation",
        bookingData: data,
        reply: "Risponda sì per confermare o no per annullare.",
      };
    }

    default:
      return {
        nextState: "idle",
        bookingData: {},
        reply: "Come posso aiutarla?",
      };
  }
}
