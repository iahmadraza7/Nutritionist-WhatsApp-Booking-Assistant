import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  demoId: z.string().min(1),
});

function demoPhone(demoId: string) {
  return `demo_session_${demoId}`.slice(0, 80);
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sessionKey = demoPhone(parsed.data.demoId);
  const conversations = await prisma.conversation.findMany({
    where: {
      channel: "WEB",
      sessionKey,
    },
    select: { id: true },
  });
  if (conversations.length === 0) return NextResponse.json({ ok: true });

  await prisma.message.deleteMany({
    where: {
      conversationId: { in: conversations.map((conversation) => conversation.id) },
    },
  });
  await prisma.conversation.deleteMany({
    where: { id: { in: conversations.map((conversation) => conversation.id) } },
  });
  return NextResponse.json({ ok: true });
}

