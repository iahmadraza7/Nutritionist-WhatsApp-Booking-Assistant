"use client";

import { useRouter } from "next/navigation";

export default function ToggleHandoffForm({
  conversationId,
  handoff,
}: {
  conversationId: string;
  handoff: boolean;
}) {
  const router = useRouter();

  async function handleToggle() {
    await fetch(`/api/admin/conversations/${conversationId}/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: !handoff, reason: handoff ? null : "ADMIN" }),
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          handoff
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
        }`}
      >
        {handoff ? "Reactivate bot" : "Handoff (doctor replying)"}
      </button>
  );
}
