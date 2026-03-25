import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import FollowUpTemplatesForm from "./FollowUpTemplatesForm";

export default async function FollowUpsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const templates = await prisma.followUpTemplate.findMany({
    orderBy: { order: "asc" },
  });

  const scheduled = await prisma.scheduledMessage.findMany({
    where: { status: "PENDING" },
    include: { template: true },
    orderBy: { scheduledFor: "asc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Follow-up Templates</h1>
      <div className="space-y-8">
        <section>
          <FollowUpTemplatesForm templates={templates} />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Upcoming Scheduled Messages</h2>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-medium">Patient Phone</th>
                  <th className="text-left p-3 font-medium">Template</th>
                  <th className="text-left p-3 font-medium">Message</th>
                  <th className="text-left p-3 font-medium">Scheduled For</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="p-3">{s.patientPhone}</td>
                    <td className="p-3">{s.template?.name ?? "-"}</td>
                    <td className="p-3 max-w-sm truncate">{s.content}</td>
                    <td className="p-3">{s.scheduledFor.toLocaleString("it-IT")}</td>
                    <td className="p-3">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scheduled.length === 0 && (
              <p className="p-6 text-center text-slate-500">No pending messages.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
