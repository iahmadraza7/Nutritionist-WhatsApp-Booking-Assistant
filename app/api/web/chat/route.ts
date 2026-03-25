import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processIncomingMessage } from "@/lib/conversation/engine";
import { z } from "zod";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId, message } = parsed.data;

  try {
    const result = await processIncomingMessage(sessionId, "Web Visitor", message, {
      channel: "web",
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: result.conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: result.conversationId },
      select: {
        id: true,
        handoff: true,
        currentFlow: true,
        status: true,
      },
    });

    return NextResponse.json({
      conversation,
      replies: result.replies,
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "WEB_CHAT_FAILED", message },
      { status: 500 }
    );
  }
}
