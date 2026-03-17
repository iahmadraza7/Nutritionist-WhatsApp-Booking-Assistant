import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const handoff = Boolean(body.handoff);
  const reason = typeof body.reason === "string" ? body.reason : null;

  await prisma.conversation.update({
    where: { id },
    data: {
      handoff,
      status: handoff ? "HANDOFF" : "ACTIVE",
      currentFlow: handoff ? "handoff" : "idle",
      handoffReason: handoff ? (reason ?? "ADMIN") : null,
      handoffAt: handoff ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: handoff ? "HANDOFF_ENABLED" : "HANDOFF_DISABLED",
      entity: "Conversation",
      entityId: id,
      meta: { reason: reason ?? "ADMIN" },
    },
  });

  return NextResponse.json({ ok: true });
}
