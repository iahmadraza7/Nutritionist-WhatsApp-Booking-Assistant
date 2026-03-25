import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_38%),linear-gradient(135deg,#f8fffc_0%,#eefbf6_45%,#ffffff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
              Hybrid Web Booking Chatbot
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-900">
              Prenotazioni sul web, promemoria su WhatsApp, gestione semplice per lo studio.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Il progetto unisce chatbot web, Google Calendar e messaggi WhatsApp automatici
              per ridurre il tempo speso su prenotazioni, spostamenti e richieste organizzative.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="inline-flex rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Apri chatbot
              </Link>
              <Link
                href="/admin"
                className="inline-flex rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Admin panel
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Flussi supportati</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  FAQ organizzative, prenotazioni, spostamento appuntamenti e reminder su
                  WhatsApp.
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-emerald-900">Costo operativo</p>
                <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                  Pensato per un piccolo studio: circa 40 pazienti al mese con costi contenuti.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Calendario</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Google Calendar resta la fonte unica per disponibilità, creazioni e spostamenti.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Escalation medica</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Le domande mediche non ricevono risposte automatiche e vengono indirizzate al
                  dottore.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
