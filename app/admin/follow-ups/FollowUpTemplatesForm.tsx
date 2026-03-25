"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  trigger: string;
  offsetDirection: string;
  offsetValue: number;
  offsetUnit: string;
  serviceScope: string;
  messageIt: string;
  messageEn: string | null;
  active: boolean;
  order: number;
}

export default function FollowUpTemplatesForm({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function addTemplate() {
    await fetch("/api/admin/follow-ups", { method: "PUT" });
    router.refresh();
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/admin/follow-ups/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = templates.map((t, i) => ({
      id: t.id,
      name: formData.get(`name_${t.id}`) ?? t.name,
      trigger: formData.get(`trigger_${t.id}`) ?? t.trigger,
      offsetDirection: formData.get(`offsetDirection_${t.id}`) ?? t.offsetDirection,
      offsetValue: parseInt((formData.get(`offsetValue_${t.id}`) ?? t.offsetValue).toString(), 10),
      offsetUnit: formData.get(`offsetUnit_${t.id}`) ?? t.offsetUnit,
      serviceScope: formData.get(`serviceScope_${t.id}`) ?? t.serviceScope,
      messageIt: formData.get(`messageIt_${t.id}`) ?? t.messageIt,
      messageEn: formData.get(`messageEn_${t.id}`) || null,
      active: formData.get(`active_${t.id}`) === "on",
      order: i,
    }));
    await fetch("/api/admin/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: data }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addTemplate}
          className="px-3 py-2 rounded-md text-sm bg-white border border-slate-200 hover:border-emerald-300"
        >
          Add template
        </button>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
        Placeholders supported: <code>{"{{patient_name}}"}</code>, <code>{"{{appointment_date}}"}</code>,{" "}
        <code>{"{{appointment_time}}"}</code>, <code>{"{{service_name}}"}</code>
      </div>
      {templates.map((t) => (
        <div key={t.id} className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                name={`name_${t.id}`}
                defaultValue={t.name}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-slate-700 mb-1">Legacy Trigger</label>
              <select
                name={`trigger_${t.id}`}
                defaultValue={t.trigger}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="BEFORE_24H">24h before</option>
                <option value="BEFORE_2H">2h before</option>
                <option value="AFTER_1D">1 day after</option>
                <option value="AFTER_3D">3 days after</option>
                <option value="AFTER_5D">5 days after</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name={`active_${t.id}`}
                  defaultChecked={t.active}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => deleteTemplate(t.id)}
                className="px-3 py-2 rounded-md text-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Direction</label>
              <select
                name={`offsetDirection_${t.id}`}
                defaultValue={t.offsetDirection}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="BEFORE">Before</option>
                <option value="AFTER">After</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Offset</label>
              <input
                name={`offsetValue_${t.id}`}
                type="number"
                min={1}
                defaultValue={t.offsetValue}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select
                name={`offsetUnit_${t.id}`}
                defaultValue={t.offsetUnit}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="MINUTES">Minutes</option>
                <option value="HOURS">Hours</option>
                <option value="DAYS">Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
              <select
                name={`serviceScope_${t.id}`}
                defaultValue={t.serviceScope}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="ALL">All appointments</option>
                <option value="FIRST_VISIT_ONLY">First visit only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message (IT)</label>
            <textarea
              name={`messageIt_${t.id}`}
              defaultValue={t.messageIt}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={2}
            />
          </div>
        </div>
      ))}
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Templates"}
      </button>
    </form>
  );
}
