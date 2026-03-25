import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { services } = await request.json() as {
    services: Array<{
      id: string;
      name: string;
      nameIt: string | null;
      serviceType: string;
      durationMin: number;
      order: number;
    }>;
  };

  for (const s of services ?? []) {
    await prisma.service.update({
      where: { id: s.id },
      data: {
        name: s.name,
        nameIt: s.nameIt,
        serviceType: s.serviceType ?? "GENERAL",
        durationMin: s.durationMin,
        order: s.order,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
