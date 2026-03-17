import { prisma } from "@/lib/db";

function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export async function findFaqAnswer(input: string, language: string = "it") {
  const faqs = await prisma.fAQEntry.findMany({
    where: { active: true, language },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });

  const n = normalize(input);
  if (!n) return null;

  // Simple MVP matcher:
  // - direct substring match question in input OR input in question
  // - fallback keyword overlap score
  let best: { answer: string; score: number } | null = null;

  const inputTokens = new Set(n.split(" ").filter((t) => t.length > 2));

  for (const faq of faqs) {
    const q = normalize(faq.question);
    if (!q) continue;
    if (n.includes(q) || q.includes(n)) {
      return faq.answer;
    }
    const qTokens = q.split(" ").filter((t) => t.length > 2);
    const overlap = qTokens.reduce((acc, t) => acc + (inputTokens.has(t) ? 1 : 0), 0);
    const score = overlap / Math.max(3, qTokens.length);
    if (!best || score > best.score) best = { answer: faq.answer, score };
  }

  if (best && best.score >= 0.34) return best.answer;
  return null;
}

