"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  nameIt: string | null;
  serviceType: string;
  durationMin: number;
  description: string | null;
  order: number;
  active: boolean;
}

export default function ServicesForm({ services }: { services: Service[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<Service[]>(services);

  function update(id: string, patch: Partial<Service>) {
    setLocal((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function addService() {
    const res = await fetch("/api/admin/services", { method: "PUT" });
    const data = await res.json();
    setLocal((prev) => [...prev, data.service]);
    router.refresh();
  }

  async function deleteService(id: string) {
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    setLocal((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const servicesData = local.map((s, i) => ({
      id: s.id,
      name: s.name,
      nameIt: s.nameIt,
      serviceType: s.serviceType,
      durationMin: s.durationMin,
      description: s.description,
      active: s.active,
      order: i,
    }));
    await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services: servicesData }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-slate-200 space-y-4 max-w-xl">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addService}
          className="px-3 py-2 rounded-md text-sm bg-white border border-slate-200 hover:border-emerald-300"
        >
          Add service
        </button>
      </div>

      {local.map((s) => (
        <div key={s.id} className="p-4 border border-slate-200 rounded-lg space-y-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name (EN)</label>
            <input
              value={s.name}
              onChange={(e) => update(s.id, { name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name (IT)</label>
            <input
              value={s.nameIt ?? ""}
              onChange={(e) => update(s.id, { nameIt: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
            <input
              type="number"
              value={s.durationMin}
              onChange={(e) => update(s.id, { durationMin: parseInt(e.target.value || "60", 10) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
            <select
              value={s.serviceType}
              onChange={(e) => update(s.id, { serviceType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="FIRST_VISIT">First visit</option>
              <option value="WEIGHING">Weighing</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={s.description ?? ""}
              onChange={(e) => update(s.id, { description: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) => update(s.id, { active: e.target.checked })}
              />
              Active
            </label>
            <button
              type="button"
              onClick={() => deleteService(s.id)}
              className="px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Services"}
      </button>
    </form>
  );
}
