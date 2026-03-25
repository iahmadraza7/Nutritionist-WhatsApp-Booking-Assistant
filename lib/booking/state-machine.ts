import type { BookingChoice, BookingData, BookingFlowState } from "@/lib/types";

export interface BookingService {
  id: string;
  name: string;
  nameIt: string | null;
  durationMin: number;
  serviceType?: string;
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

const DOW_MAP_IT: Array<{ keys: string[]; dow: number }> = [
  { keys: ["lunedì", "lunedi", "lun"], dow: 1 },
  { keys: ["martedì", "martedi", "mar"], dow: 2 },
  { keys: ["mercoledì", "mercoledi", "mer"], dow: 3 },
  { keys: ["giovedì", "giovedi", "gio"], dow: 4 },
  { keys: ["venerdì", "venerdi", "ven"], dow: 5 },
  { keys: ["sabato", "sab"], dow: 6 },
  { keys: ["domenica", "dom"], dow: 0 },
];

function normalizeText(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export function formatDateForDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function parseDate(input: string): Date | null {
  const lower = normalizeText(input);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lower.includes("oggi") || lower.includes("today")) {
    return new Date(today);
  }
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

  const dowMatch = DOW_MAP_IT.find((d) => d.keys.some((k) => lower.includes(k)));
  if (dowMatch) {
    const d = new Date(today);
    const current = d.getDay();
    const delta = (dowMatch.dow - current + 7) % 7 || 7;
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

export function parseTime(input: string): string | null {
  const m = input.match(/(\d{1,2})[:\s]*(\d{2})?\s*(am|pm)?/i) ?? input.match(/(\d{1,2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === "pm" && h < 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function listServices(services: BookingService[]) {
  return services.map((s) => `• ${s.nameIt ?? s.name}`).join("\n");
}

function listRescheduleOptions(options: BookingChoice[]) {
  return options
    .map((option, index) => `${index + 1}. ${option.label}`)
    .join("\n");
}

function trySelectBookingOption(
  message: string,
  options: BookingChoice[]
): BookingChoice | null {
  const trimmed = message.trim();
  const numericChoice = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(numericChoice) && numericChoice >= 1 && numericChoice <= options.length) {
    return options[numericChoice - 1];
  }

  const normalized = normalizeText(trimmed);
  return (
    options.find((option) => normalizeText(option.label).includes(normalized)) ?? null
  );
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
      return {
        nextState: "awaiting_contact",
        bookingData: data,
        reply:
          "Grazie. Inserisca ora il suo numero WhatsApp, così potrò confermare l'appuntamento e inviarle il promemoria.",
      };
    }

    case "awaiting_contact":
      return {
        nextState: "awaiting_contact",
        bookingData: data,
        reply: "Inserisca il suo numero WhatsApp completo, incluso prefisso internazionale.",
      };

    case "awaiting_service": {
      const msg = normalizeText(userMessage);
      const match =
        services.find((s) => normalizeText(s.nameIt ?? s.name) === msg) ??
        services.find(
          (s) =>
            normalizeText(s.nameIt ?? s.name).includes(msg) ||
            msg.includes(normalizeText(s.nameIt ?? s.name))
        );

      if (!match) {
        return {
          nextState: "awaiting_service",
          bookingData: data,
          reply: `Non ho riconosciuto il servizio. Scegli tra:\n${listServices(services)}`,
        };
      }
      data.serviceId = match.id;
      data.serviceName = match.nameIt ?? match.name;
      return {
        nextState: "awaiting_date",
        bookingData: data,
        reply: `Perfetto, ${data.serviceName}. In quale data preferisce l'appuntamento? (es. domani, 28/03/2026)`,
      };
    }

    case "awaiting_date": {
      const date = parseDate(userMessage);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      if (!date || date < startOfToday) {
        return {
          nextState: "awaiting_date",
          bookingData: data,
          reply: "Data non valida. Inserisca una data futura (es. domani, 28/03/2026).",
        };
      }
      data.date = date.toISOString().split("T")[0];
      return {
        nextState: "awaiting_time",
        bookingData: data,
        reply: `Ottimo, ${formatDateForDisplay(data.date)}. A che ora preferisce? (es. 15:00, 17:30)`,
      };
    }

    case "awaiting_time": {
      const time = parseTime(userMessage);
      if (!time) {
        return {
          nextState: "awaiting_time",
          bookingData: data,
          reply: "Ora non valida. Inserisca un orario (es. 15:00 o 17:30).",
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
        reply: `Riepilogo:\n${summary}\nNumero WhatsApp: ${data.phone}\n\nConferma la prenotazione? (sì/no)`,
      };
    }

    case "awaiting_confirmation": {
      const confirm = normalizeText(userMessage);
      if (confirm.startsWith("s") || confirm === "si" || confirm === "yes" || confirm === "y") {
        return {
          nextState: "booked",
          bookingData: data,
          reply:
            "Prenotazione confermata! Riceverà un promemoria su WhatsApp prima dell'appuntamento.",
          done: true,
        };
      }
      if (confirm.startsWith("n") || confirm === "no") {
        return {
          nextState: "idle",
          bookingData: {},
          reply: "Prenotazione annullata. Se vuole riprovare, scriva che desidera prenotare.",
        };
      }
      return {
        nextState: "awaiting_confirmation",
        bookingData: data,
        reply: "Risponda sì per confermare o no per annullare.",
      };
    }

    case "awaiting_reschedule_contact":
      return {
        nextState: "awaiting_reschedule_contact",
        bookingData: data,
        reply:
          "Per spostare l'appuntamento, inserisca il numero WhatsApp usato per la prenotazione.",
      };

    case "awaiting_reschedule_selection": {
      const options = data.rescheduleOptions ?? [];
      const selected = trySelectBookingOption(userMessage, options);
      if (!selected) {
        return {
          nextState: "awaiting_reschedule_selection",
          bookingData: data,
          reply: `Non ho capito quale appuntamento desidera spostare. Risponda con il numero corretto:\n${listRescheduleOptions(options)}`,
        };
      }

      data.selectedBookingId = selected.id;
      data.selectedBookingLabel = selected.label;
      data.selectedBookingServiceId = selected.serviceId;
      data.selectedBookingServiceName = selected.serviceName;

      return {
        nextState: "awaiting_reschedule_date",
        bookingData: data,
        reply: `Perfetto. Quale nuova data desidera per questo appuntamento?\n${selected.label}`,
      };
    }

    case "awaiting_reschedule_date": {
      const date = parseDate(userMessage);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      if (!date || date < startOfToday) {
        return {
          nextState: "awaiting_reschedule_date",
          bookingData: data,
          reply: "Data non valida. Inserisca una data futura per il nuovo appuntamento.",
        };
      }

      data.date = date.toISOString().split("T")[0];
      return {
        nextState: "awaiting_reschedule_time",
        bookingData: data,
        reply: `Perfetto. A che ora desidera spostarlo il ${formatDateForDisplay(data.date)}?`,
      };
    }

    case "awaiting_reschedule_time": {
      const time = parseTime(userMessage);
      if (!time) {
        return {
          nextState: "awaiting_reschedule_time",
          bookingData: data,
          reply: "Ora non valida. Inserisca un orario nel formato 15:00 o 17:30.",
        };
      }

      data.time = time;

      if (availableSlots && availableSlots.length > 0 && !availableSlots.includes(time)) {
        return {
          nextState: "awaiting_reschedule_time",
          bookingData: data,
          reply: `L'orario ${time} non è disponibile. Orari disponibili: ${availableSlots.join(", ")}`,
        };
      }

      return {
        nextState: "awaiting_reschedule_confirmation",
        bookingData: data,
        reply: `Conferma lo spostamento di "${data.selectedBookingLabel}" a ${formatDateForDisplay(
          data.date!
        )} alle ${time}? (sì/no)`,
      };
    }

    case "awaiting_reschedule_confirmation": {
      const confirm = normalizeText(userMessage);
      if (confirm.startsWith("s") || confirm === "si" || confirm === "yes" || confirm === "y") {
        return {
          nextState: "rescheduled",
          bookingData: data,
          reply: "Appuntamento spostato con successo. Riceverà un nuovo promemoria su WhatsApp.",
          done: true,
        };
      }
      if (confirm.startsWith("n") || confirm === "no") {
        return {
          nextState: "idle",
          bookingData: {},
          reply: "Va bene, non ho modificato l'appuntamento.",
        };
      }
      return {
        nextState: "awaiting_reschedule_confirmation",
        bookingData: data,
        reply: "Risponda sì per confermare lo spostamento o no per annullare.",
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
