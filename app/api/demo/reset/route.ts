import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  demoId: z.string().min(1),
});

function demoPhone(demoId: string) {
  return `demo_${demoId}`.slice(0, 40);
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const phone = demoPhone(parsed.data.demoId);
  const patient = await prisma.patient.findUnique({ where: { phone } });
  if (!patient) return NextResponse.json({ ok: true });

  // Cascade deletes take care of conversations/messages/bookings.
  await prisma.patient.delete({ where: { id: patient.id } });
  return NextResponse.json({ ok: true });
}

