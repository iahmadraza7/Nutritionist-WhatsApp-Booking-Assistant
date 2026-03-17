"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Faq = {
  id: string;
  question: string;
  answer: string;
  language: string;
  category: string;
  active: boolean;
  order: number;
};

export default function FaqsForm({ initialFaqs }: { initialFaqs: Faq[] }) {
  const router = useRouter();
  const [faqs, setFaqs] = useState<Faq[]>(initialFaqs);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...faqs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [faqs]
  );

  async function saveAll() {
    setSaving(true);
    await fetch("/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faqs: sorted }),
    });
    setSaving(false);
    router.refresh();
  }

  async function addNew() {
    const res = await fetch("/api/admin/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Domanda...",
        answer: "Risposta...",
        language: "it",
        category: "general",
      }),
    });
    const data = await res.json();
    setFaqs((prev) => [...prev, data.faq]);
  }

  async function remove(id: string) {
    await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    router.refresh();
  }

  function update(id: string, patch: Partial<Faq>) {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={addNew}
          className="px-4 py-2 bg-white border border-slate-200 rounded-md hover:border-emerald-300"
          type="button"
        >
          Add FAQ
        </button>
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
          type="button"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((f, idx) => (
          <div key={f.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                value={f.order}
                onChange={(e) => update(f.id, { order: parseInt(e.target.value || "0", 10) })}
                className="w-20 px-2 py-1 border border-slate-300 rounded"
                type="number"
              />
              <select
                value={f.category}
                onChange={(e) => update(f.id, { category: e.target.value })}
                className="px-2 py-1 border border-slate-300 rounded"
              >
                <option value="hours">hours</option>
                <option value="location">location</option>
                <option value="pricing">pricing</option>
                <option value="booking">booking</option>
                <option value="cancellation">cancellation</option>
                <option value="general">general</option>
              </select>
              <select
                value={f.language}
                onChange={(e) => update(f.id, { language: e.target.value })}
                className="px-2 py-1 border border-slate-300 rounded"
              >
                <option value="it">it</option>
                <option value="en">en</option>
              </select>
              <label className="ml-auto flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={f.active}
                  onChange={(e) => update(f.id, { active: e.target.checked })}
                />
                Active
              </label>
              <button
                onClick={() => remove(f.id)}
                className="px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
                type="button"
              >
                Delete
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Question</label>
              <input
                value={f.question}
                onChange={(e) => update(f.id, { question: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Answer</label>
              <textarea
                value={f.answer}
                onChange={(e) => update(f.id, { answer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                rows={3}
              />
            </div>

            <div className="text-xs text-slate-400">#{idx + 1} • {f.id}</div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-6 text-center">
            No FAQs yet. Click “Add FAQ”.
          </div>
        )}
      </div>
    </div>
  );
}

