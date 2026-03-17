import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processIncomingMessage } from "@/lib/conversation/engine";
import { z } from "zod";

const bodySchema = z.object({
  demoId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

function demoPhone(demoId: string) {
  // Patient.phone is a string in our schema; keep it stable + unique per demo session.
  return `demo_${demoId}`.slice(0, 40);
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { demoId, message } = parsed.data;
  const phone = demoPhone(demoId);

  const result = await processIncomingMessage(phone, "Demo Patient", message, {
    channel: "demo_web",
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: result.conversationId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id: result.conversationId },
    select: { id: true, handoff: true, currentFlow: true, status: true },
  });

  return NextResponse.json({
    conversation,
    replies: result.replies,
    messages,
  });
}

