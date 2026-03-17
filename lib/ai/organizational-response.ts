import OpenAI from "openai";

export interface ClinicContext {
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

const SYSTEM_PROMPT = `You are a polite, professional assistant for a nutritionist clinic. You answer ONLY organizational and administrative questions.

RULES:
- Be short, clear, and professional
- Answer ONLY: opening hours, location, how to book, prices, cancellation policy, contact info
- NEVER give medical advice, diet recommendations, or health guidance
- If the user asks something medical or health-related, say exactly: "The doctor will reply to you shortly."
- Ask one question at a time when helping with booking
- Prefer Italian if the user writes in Italian
- Use ONLY the clinic info provided below
- If you don't know something, say you'll have the doctor follow up
`;

export async function generateOrganizationalResponse(
  userMessage: string,
  context: ClinicContext,
  openai: OpenAI
): Promise<string> {
  const contextStr = `
Clinic: ${context.clinicName}
Doctor: ${context.doctorName}
Address: ${context.address ?? "Not specified"}
Phone: ${context.phone ?? "Not specified"}
Email: ${context.email ?? "Not specified"}
Working hours: ${JSON.stringify(context.workingHours)}
Services: ${context.services.map((s) => s.nameIt ?? s.name).join(", ")}
Cancellation policy: ${context.cancellationPolicy ?? "Contact the clinic"}
Default language: ${context.defaultLanguage}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT + "\n\nClinic info:\n" + contextStr },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content?.trim() ?? "I'll have the doctor follow up with you shortly.";
}
