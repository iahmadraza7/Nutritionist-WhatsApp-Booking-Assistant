import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ handoff?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const handoffOnly = params.handoff === "1";

  const conversations = await prisma.conversation.findMany({
    where: handoffOnly ? { handoff: true } : undefined,
    include: { patient: true },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Conversations</h1>
      <div className="mb-4">
        <Link
          href={handoffOnly ? "/admin/conversations" : "/admin/conversations?handoff=1"}
          className="text-sm text-emerald-600 hover:underline"
        >
          {handoffOnly ? "Show all" : "Show handoff only"}
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-medium">Patient</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Flow</th>
              <th className="text-left p-3 font-medium">Last message</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3">{c.patient?.fullName ?? "Web visitor"}</td>
                <td className="p-3">{c.patient?.phone ?? c.sessionKey ?? "-"}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      c.handoff ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {c.handoff ? "Handoff" : "Active"}
                  </span>
                </td>
                <td className="p-3">{c.currentFlow}</td>
                <td className="p-3 text-slate-500">
                  {c.lastMessageAt?.toLocaleString("it-IT") ?? "-"}
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/conversations/${c.id}`}
                    className="text-emerald-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {conversations.length === 0 && (
          <p className="p-6 text-center text-slate-500">No conversations yet.</p>
        )}
      </div>
    </div>
  );
}
