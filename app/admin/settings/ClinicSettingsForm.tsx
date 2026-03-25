"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Clinic {
  id: string;
  clinicName: string;
  doctorName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  workingHours: unknown;
  cancellationPolicy: string | null;
  defaultLanguage: string;
  medicalFallbackMessage: string;
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DayHours = { open: string; close: string } | null;
type WorkingHours = Record<DayKey, DayHours>;

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export default function ClinicSettingsForm({ clinic }: { clinic: Clinic | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    ((clinic?.workingHours as WorkingHours | undefined) ?? {
    mon: { open: "15:00", close: "19:00" },
    tue: { open: "15:00", close: "19:00" },
    wed: { open: "15:00", close: "19:00" },
    thu: { open: "15:00", close: "19:00" },
    fri: { open: "15:00", close: "19:00" },
    sat: null,
    sun: null,
  }) as WorkingHours
  );

  function setClosed(day: DayKey, closed: boolean) {
    setWorkingHours((prev) => ({ ...prev, [day]: closed ? null : (prev[day] ?? { open: "15:00", close: "19:00" }) }));
  }
  function setTime(day: DayKey, key: "open" | "close", value: string) {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day]!, [key]: value } : { open: "15:00", close: "19:00", [key]: value } as any,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      clinicName: formData.get("clinicName"),
      doctorName: formData.get("doctorName"),
      address: formData.get("address") || null,
      phone: formData.get("phone") || null,
      email: formData.get("email") || null,
      timezone: formData.get("timezone") || "Europe/Rome",
      cancellationPolicy: formData.get("cancellationPolicy") || null,
      defaultLanguage: formData.get("defaultLanguage") || "it",
      medicalFallbackMessage: formData.get("medicalFallbackMessage") || "The doctor will reply to you shortly.",
      workingHours,
    };
    await fetch("/api/admin/settings/clinic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-slate-200 space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Name</label>
        <input
          name="clinicName"
          defaultValue={clinic?.clinicName ?? ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Doctor Name</label>
        <input
          name="doctorName"
          defaultValue={clinic?.doctorName ?? ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
        <input
          name="address"
          defaultValue={clinic?.address ?? ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
        <input
          name="phone"
          defaultValue={clinic?.phone ?? ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={clinic?.email ?? ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
        <input
          name="timezone"
          defaultValue={clinic?.timezone ?? "Europe/Rome"}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Default language</label>
        <select
          name="defaultLanguage"
          defaultValue={clinic?.defaultLanguage ?? "it"}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
        >
          <option value="it">Italian</option>
          <option value="en">English</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Working hours</label>
        <div className="space-y-2">
          {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => {
            const val = workingHours[day];
            const closed = val === null;
            return (
              <div key={day} className="flex items-center gap-2 p-2 border border-slate-200 rounded-md">
                <div className="w-10 text-sm font-medium text-slate-700">{DAY_LABELS[day]}</div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={closed}
                    onChange={(e) => setClosed(day, e.target.checked)}
                  />
                  Closed
                </label>
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={val?.open ?? "15:00"}
                    disabled={closed}
                    onChange={(e) => setTime(day, "open", e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-md disabled:opacity-50"
                  />
                  <span className="text-slate-400">→</span>
                  <input
                    type="time"
                    value={val?.close ?? "19:00"}
                    disabled={closed}
                    onChange={(e) => setTime(day, "close", e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-md disabled:opacity-50"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Policy</label>
        <textarea
          name="cancellationPolicy"
          defaultValue={clinic?.cancellationPolicy ?? ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Medical Fallback Message</label>
        <input
          name="medicalFallbackMessage"
          defaultValue={clinic?.medicalFallbackMessage ?? "The doctor will reply to you shortly."}
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
