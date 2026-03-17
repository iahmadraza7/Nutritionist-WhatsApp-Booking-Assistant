import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [conversationsCount, bookingsCount, handoffCount, patientsCount] =
    await Promise.all([
      prisma.conversation.count(),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.conversation.count({ where: { handoff: true } }),
      prisma.patient.count(),
    ]);

  const stats = [
    { label: "Conversations", value: conversationsCount, href: "/admin/conversations" },
    { label: "Active Bookings", value: bookingsCount, href: "/admin/bookings" },
    { label: "Handoff (Doctor)", value: handoffCount, href: "/admin/conversations?handoff=1" },
    { label: "Patients", value: patientsCount, href: "/admin/conversations" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 transition"
          >
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{s.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
