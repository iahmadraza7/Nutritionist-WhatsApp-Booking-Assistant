import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import ToggleHandoffForm from "./ToggleHandoffForm";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      patient: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  return (
    <div>
      <Link href="/admin/conversations" className="text-sm text-emerald-600 hover:underline mb-4 block">
        ← Back
      </Link>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {conversation.patient?.fullName ?? "Web visitor"}
          </h1>
          <p className="text-slate-600">{conversation.patient?.phone ?? conversation.sessionKey ?? "-"}</p>
          <p className="text-sm text-slate-500 mt-1">
            Status: {conversation.handoff ? "Handoff (Doctor replying)" : "Active"}
            {conversation.handoff && (
              <>
                {" "}
                • Reason:{" "}
                <span className="font-mono text-xs">{conversation.handoffReason ?? "MEDICAL_QUERY"}</span>
                {" "}
                • At:{" "}
                <span className="text-xs">{conversation.handoffAt?.toLocaleString("it-IT") ?? "-"}</span>
              </>
            )}
          </p>
        </div>
        <ToggleHandoffForm
          conversationId={conversation.id}
          handoff={conversation.handoff}
        />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {conversation.messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                m.direction === "OUTBOUND"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              <p className="text-sm">{m.content}</p>
              <p className="text-xs text-slate-500 mt-1">
                {m.createdAt.toLocaleString("it-IT")} • {m.direction}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
