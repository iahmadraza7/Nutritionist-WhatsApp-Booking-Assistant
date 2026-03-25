"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Msg = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  createdAt: string;
};

function createSessionId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function ChatClient() {
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [handoff, setHandoff] = useState(false);
  const [flow, setFlow] = useState("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem("webChatSessionId");
    if (existing) {
      setSessionId(existing);
      return;
    }
    const nextSession = createSessionId();
    localStorage.setItem("webChatSessionId", nextSession);
    setSessionId(nextSession);
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function send() {
    if (!sessionId || !input.trim()) return;
    setLoading(true);
    const text = input.trim();
    setInput("");

    const response = await fetch("/api/web/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message: text }),
    });
    const data = await response.json();

    setMessages(
      (data.messages ?? []).map((message: any) => ({
        id: message.id,
        direction: message.direction,
        content: message.content,
        createdAt: message.createdAt,
      }))
    );
    setHandoff(Boolean(data.conversation?.handoff));
    setFlow(data.conversation?.currentFlow ?? "idle");
    setLoading(false);
  }

  function resetChat() {
    const nextSession = createSessionId();
    localStorage.setItem("webChatSessionId", nextSession);
    setSessionId(nextSession);
    setMessages([]);
    setHandoff(false);
    setFlow("idle");
    setInput("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Booking Assistant
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                  Prenota o sposta il tuo appuntamento
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Il chatbot gestisce richieste organizzative, prenotazioni e spostamenti.
                  Per domande mediche, ti indirizzerà direttamente al dottore su WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={resetChat}
                disabled={loading}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
              >
                Nuova chat
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>
                Flusso: <span className="font-mono text-slate-900">{flow}</span>
              </span>
              <span>
                Escalation:{" "}
                <span className={handoff ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                  {handoff ? "attiva" : "non attiva"}
                </span>
              </span>
            </div>

            <div className="h-[560px] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
              {messages.length === 0 ? (
                <div className="space-y-4 text-sm text-slate-600">
                  <p>Puoi iniziare scrivendo, ad esempio:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setInput("Vorrei prenotare una prima visita")}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300"
                    >
                      Vorrei prenotare una prima visita
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput("Devo spostare un appuntamento")}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300"
                    >
                      Devo spostare un appuntamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput("Quali sono gli orari dello studio?")}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300"
                    >
                      Quali sono gli orari dello studio?
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput("Che dieta devo seguire per il diabete?")}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300"
                    >
                      Che dieta devo seguire per il diabete?
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === "OUTBOUND" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                          message.direction === "OUTBOUND"
                            ? "bg-white text-slate-900"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void send();
                  }
                }}
                placeholder="Scrivi qui il tuo messaggio..."
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-400"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Invia
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Come funziona</p>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                <li>Il paziente inserisce nome e numero WhatsApp.</li>
                <li>Il chatbot propone gli slot disponibili in Google Calendar.</li>
                <li>Promemoria e follow-up vengono inviati su WhatsApp.</li>
                <li>Le richieste mediche vengono indirizzate al dottore.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-900">Stima costi mensili</p>
              <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                Per circa 40 pazienti al mese, il costo operativo resta leggero: poche
                conversazioni OpenAI per prenotazioni/FAQ e circa 40-80 messaggi WhatsApp
                automatici tra promemoria e follow-up.
              </p>
              <p className="mt-3 text-xs text-emerald-900/70">
                La spesa reale dipende dai volumi e dalle tariffe del tuo account WhatsApp
                Business / OpenAI.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Area amministrazione</p>
              <p className="mt-2 text-sm text-slate-600">
                Lato clinica puoi modificare orari, servizi, FAQ e testi automatici dal pannello
                admin.
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Apri admin
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
