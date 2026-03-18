"use client";

import { useEffect, useMemo, useState } from "react";

type Msg = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  createdAt: string;
};

export default function DemoChat() {
  const [demoId, setDemoId] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [handoff, setHandoff] = useState<boolean>(false);
  const [flow, setFlow] = useState<string>("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem("demoId");
    if (existing) {
      setDemoId(existing);
      return;
    }
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("demoId", id);
    setDemoId(id);
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function send() {
    if (!demoId) return;
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setInput("");
    const res = await fetch("/api/demo/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoId, message: text }),
    });
    const data = await res.json();
    setMessages(
      (data.messages ?? []).map((m: any) => ({
        id: m.id,
        direction: m.direction,
        content: m.content,
        createdAt: m.createdAt,
      }))
    );
    setHandoff(Boolean(data.conversation?.handoff));
    setFlow(data.conversation?.currentFlow ?? "idle");
    setLoading(false);
  }

  async function reset() {
    if (!demoId) return;
    setLoading(true);
    await fetch("/api/demo/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoId }),
    });
    setMessages([]);
    setHandoff(false);
    setFlow("idle");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Demo Chat Simulator</h1>
            <p className="text-sm text-slate-600">
              Test booking, FAQs, and medical handoff without WhatsApp credentials.
            </p>
            <div className="mt-2 text-xs text-slate-500">
              Flow: <span className="font-mono">{flow}</span> • Handoff:{" "}
              <span className={handoff ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
                {handoff ? "ON (doctor replying)" : "OFF"}
              </span>
            </div>
          </div>
          <button
            onClick={reset}
            disabled={loading}
            className="px-3 py-2 rounded-md text-sm bg-white border border-slate-200 hover:border-emerald-300 disabled:opacity-50"
          >
            Reset demo
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 h-[520px] overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-slate-500">
              Try:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>“Quali sono gli orari?”</li>
                <li>“Voglio prenotare”</li>
                <li>“Che dieta per il diabete?” (handoff)</li>
              </ul>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.direction === "OUTBOUND"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={!canSend}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

