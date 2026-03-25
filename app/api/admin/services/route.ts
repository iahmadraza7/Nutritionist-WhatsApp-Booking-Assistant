import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameIt: z.string().nullable().optional(),
  serviceType: z.enum(["FIRST_VISIT", "WEIGHING", "GENERAL"]).default("GENERAL"),
  durationMin: z.number().int().min(10).max(240),
  description: z.string().nullable().optional(),
  active: z.boolean(),
  order: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = z.object({ services: z.array(serviceSchema) }).safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  for (const s of parsed.data.services) {
    await prisma.service.update({
      where: { id: s.id },
      data: {
        name: s.name,
        nameIt: s.nameIt ?? null,
        serviceType: s.serviceType,
        durationMin: s.durationMin,
        description: s.description ?? null,
        active: s.active,
        order: s.order,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const maxOrder = await prisma.service.aggregate({ _max: { order: true } });
  const service = await prisma.service.create({
    data: {
      name: "New Service",
      nameIt: "Nuovo servizio",
      serviceType: "GENERAL",
      durationMin: 60,
      description: null,
      active: true,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json({ service });
}

