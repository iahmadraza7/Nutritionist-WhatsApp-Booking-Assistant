import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-emerald-800">
          Nutritionist WhatsApp Booking
        </h1>
        <p className="text-lg text-emerald-700 max-w-md">
          AI-powered assistant for appointments, FAQs, and patient follow-ups.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/admin"
            className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
          >
            Admin Panel
          </Link>
          <Link
            href="/demo/chat"
            className="inline-block px-6 py-3 bg-white text-emerald-700 rounded-lg font-medium border border-emerald-200 hover:border-emerald-300 transition"
          >
            Demo Chat
          </Link>
        </div>
      </div>
    </div>
  );
}
