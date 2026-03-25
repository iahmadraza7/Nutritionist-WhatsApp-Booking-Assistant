import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncScheduledMessagesForActiveBookings } from "@/lib/follow-up-scheduler";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.followUpTemplate.delete({ where: { id } });
  await syncScheduledMessagesForActiveBookings();
  return NextResponse.json({ ok: true });
}

