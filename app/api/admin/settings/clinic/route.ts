import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    clinicName,
    doctorName,
    address,
    phone,
    email,
    timezone,
    workingHours,
    cancellationPolicy,
    defaultLanguage,
    medicalFallbackMessage,
  } = body;

  const existing = await prisma.clinicConfig.findFirst({ orderBy: { createdAt: "desc" } });
  if (existing) {
    await prisma.clinicConfig.update({
      where: { id: existing.id },
      data: {
        clinicName: clinicName ?? existing.clinicName,
        doctorName: doctorName ?? existing.doctorName,
        address: address ?? existing.address,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
        timezone: timezone ?? existing.timezone,
        workingHours: (workingHours as object) ?? existing.workingHours,
        cancellationPolicy: cancellationPolicy ?? existing.cancellationPolicy,
        defaultLanguage: defaultLanguage ?? existing.defaultLanguage,
        medicalFallbackMessage: medicalFallbackMessage ?? existing.medicalFallbackMessage,
      },
    });
  } else {
    await prisma.clinicConfig.create({
      data: {
        clinicName: clinicName ?? "Clinic",
        doctorName: doctorName ?? "Doctor",
        address: address ?? null,
        phone: phone ?? null,
        email: email ?? null,
        timezone: timezone ?? "Europe/Rome",
        workingHours: (workingHours as object) ?? {},
        cancellationPolicy: cancellationPolicy ?? null,
        defaultLanguage: defaultLanguage ?? "it",
        medicalFallbackMessage: medicalFallbackMessage ?? "The doctor will reply to you shortly.",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
