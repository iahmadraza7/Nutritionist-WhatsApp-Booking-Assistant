import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const faqSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  language: z.string().min(2).max(8).default("it"),
  category: z.string().min(1).default("general"),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = z.object({ faqs: z.array(faqSchema) }).safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  for (const f of parsed.data.faqs) {
    await prisma.fAQEntry.update({
      where: { id: f.id },
      data: {
        question: f.question,
        answer: f.answer,
        language: f.language,
        category: f.category,
        active: f.active,
        order: f.order,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = z
    .object({
      question: z.string().min(1),
      answer: z.string().min(1),
      language: z.string().min(2).max(8).default("it"),
      category: z.string().min(1).default("general"),
    })
    .safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const maxOrder = await prisma.fAQEntry.aggregate({ _max: { order: true } });
  const faq = await prisma.fAQEntry.create({
    data: {
      question: parsed.data.question,
      answer: parsed.data.answer,
      language: parsed.data.language,
      category: parsed.data.category,
      active: true,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json({ faq });
}

