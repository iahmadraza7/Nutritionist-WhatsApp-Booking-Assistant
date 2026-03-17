import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ClinicSettingsForm from "./ClinicSettingsForm";
import ServicesForm from "./ServicesForm";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [clinic, services] = await Promise.all([
    prisma.clinicConfig.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.service.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Clinic Info</h2>
          <ClinicSettingsForm clinic={clinic} />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Services</h2>
          <ServicesForm services={services} />
        </section>
      </div>
    </div>
  );
}
