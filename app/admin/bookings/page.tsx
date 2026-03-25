import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const bookings = await prisma.booking.findMany({
    include: { patient: true, service: true },
    orderBy: { appointmentAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Bookings</h1>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-medium">Patient</th>
              <th className="text-left p-3 font-medium">Service</th>
              <th className="text-left p-3 font-medium">Date & Time</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-3">
                  <p className="font-medium">{b.patient.fullName}</p>
                  <p className="text-slate-500 text-xs">{b.patient.phone ?? "-"}</p>
                </td>
                <td className="p-3">{b.service.nameIt ?? b.service.name}</td>
                <td className="p-3">{b.appointmentAt.toLocaleString("it-IT")}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      b.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800"
                        : b.status === "CANCELLED"
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="p-3">{b.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <p className="p-6 text-center text-slate-500">No bookings yet.</p>
        )}
      </div>
    </div>
  );
}
