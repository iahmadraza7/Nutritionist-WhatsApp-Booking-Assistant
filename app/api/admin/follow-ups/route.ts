import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templates } = await request.json() as {
    templates: Array<{
      id: string;
      name: string;
      trigger: string;
      messageIt: string;
      messageEn: string | null;
      active: boolean;
      order: number;
    }>;
  };

  for (const t of templates ?? []) {
    await prisma.followUpTemplate.update({
      where: { id: t.id },
      data: {
        name: t.name,
        trigger: t.trigger,
        messageIt: t.messageIt,
        messageEn: t.messageEn,
        active: t.active,
        order: t.order,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const maxOrder = await prisma.followUpTemplate.aggregate({ _max: { order: true } });
  const tpl = await prisma.followUpTemplate.create({
    data: {
      name: "New template",
      trigger: "BEFORE_24H",
      messageIt: "Messaggio promemoria...",
      messageEn: null,
      active: true,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json({ template: tpl });
}
