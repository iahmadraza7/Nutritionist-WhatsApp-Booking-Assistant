import OpenAI from "openai";
import type { Intent } from "@/lib/types";

const MEDICAL_KEYWORDS_IT = [
  "dieta", "diabete", "diabetico", "glicemia", "colesterolo", "pressione",
  "dolore", "mal di", "malattia", "sintomo", "cura", "curare", "trattamento",
  "integratori", "integratore", "supplemento", "farmaco", "medicina",
  "allergia", "intolleranza", "intollerante", "celiachia", "celiaco",
  "stomaco", "intestino", "gonfiore", "nausea", "vomito", "diarrea",
  "peso", "dimagrire", "obesità", "anoressia", "bulimia",
  "gravidanza", "allattamento", "bambino", "bambini",
  "patologia", "diagnosi", "esame", "analisi del sangue",
  "mangiare per", "cosa mangiare se", "posso prendere", "devo evitare",
];

const MEDICAL_KEYWORDS_EN = [
  "diet", "diabetes", "blood sugar", "cholesterol", "blood pressure",
  "pain", "symptom", "treatment", "cure", "supplement", "medicine",
  "allergy", "intolerance", "celiac", "stomach", "intestine",
  "bloating", "nausea", "vomit", "diarrhea", "weight", "pregnancy",
  "diagnosis", "what to eat if", "can I take", "should I avoid",
];

const BOOKING_KEYWORDS = [
  "prenotare", "prenotazione", "appuntamento", "visita", "consulto",
  "book", "booking", "appointment", "schedule", "visit", "consultation",
  "disponibilità", "availability", "orari", "slots", "quando",
];

const ORGANIZATIONAL_KEYWORDS = [
  "orari", "apertura", "chiusura", "dove", "indirizzo", "costo", "prezzo",
  "hours", "open", "close", "where", "address", "cost", "price",
  "annullare", "rimandare", "cancellare", "cancel", "reschedule",
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function containsAny(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some((kw) => normalized.includes(kw));
}

export function ruleBasedIntent(text: string): Intent | null {
  const t = normalizeText(text);

  if (containsAny(t, MEDICAL_KEYWORDS_IT) || containsAny(t, MEDICAL_KEYWORDS_EN)) {
    return "MEDICAL_QUERY";
  }

  if (t.includes("annulla") || t.includes("cancel") || t.includes("cancella")) {
    return "CANCEL_BOOKING";
  }
  if (t.includes("rimanda") || t.includes("reschedule") || t.includes("sposta")) {
    return "RESCHEDULE_BOOKING";
  }
  if (t.includes("prenotazione") || t.includes("appuntamento") || t.includes("booking")) {
    if (t.includes("controlla") || t.includes("check") || t.includes("verifica")) {
      return "CHECK_BOOKING";
    }
    return "BOOK_APPOINTMENT";
  }

  if (containsAny(t, ORGANIZATIONAL_KEYWORDS)) {
    return "ORGANIZATIONAL";
  }
  if (containsAny(t, BOOKING_KEYWORDS)) {
    return "BOOK_APPOINTMENT";
  }

  return null;
}

const INTENT_LABELS: Intent[] = [
  "ORGANIZATIONAL",
  "BOOK_APPOINTMENT",
  "CHECK_BOOKING",
  "RESCHEDULE_BOOKING",
  "CANCEL_BOOKING",
  "MEDICAL_QUERY",
  "HUMAN_HANDOFF",
  "OTHER",
];

export async function llmIntentClassification(
  text: string,
  openai: OpenAI
): Promise<Intent> {
  const prompt = `You are an intent classifier for a nutritionist's WhatsApp assistant.
Classify the user message into exactly ONE of these intents:
- ORGANIZATIONAL: questions about hours, location, prices, policies, general info
- BOOK_APPOINTMENT: user wants to book a new appointment
- CHECK_BOOKING: user wants to check existing booking status
- RESCHEDULE_BOOKING: user wants to change appointment date/time
- CANCEL_BOOKING: user wants to cancel an appointment
- MEDICAL_QUERY: ANY question about diet, health, symptoms, supplements, what to eat for a condition, medical advice. BE CONSERVATIVE: when in doubt, use MEDICAL_QUERY.
- HUMAN_HANDOFF: user explicitly asks to speak to a human/doctor
- OTHER: anything else

User message: "${text}"

Reply with ONLY the intent label, nothing else.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 20,
  });

  const label = (response.choices[0]?.message?.content ?? "OTHER")
    .trim()
    .toUpperCase()
    .replace(/\s/g, "_");

  if (INTENT_LABELS.includes(label as Intent)) {
    return label as Intent;
  }
  return "OTHER";
}

export async function classifyIntent(text: string, openai?: OpenAI): Promise<Intent> {
  const ruleResult = ruleBasedIntent(text);
  if (ruleResult) return ruleResult;

  if (openai && process.env.OPENAI_API_KEY) {
    return llmIntentClassification(text, openai);
  }

  return "OTHER";
}
