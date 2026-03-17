import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isLoginPage = false;

  return (
    <div className="min-h-screen bg-slate-50">
      {session ? (
        <div className="flex">
          <aside className="w-56 bg-white border-r border-slate-200 min-h-screen p-4">
            <nav className="space-y-1">
              <Link
                href="/admin"
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/conversations"
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Conversations
              </Link>
              <Link
                href="/admin/bookings"
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Bookings
              </Link>
              <Link
                href="/admin/settings"
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Settings
              </Link>
              <Link
                href="/admin/faqs"
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                FAQs
              </Link>
              <Link
                href="/admin/follow-ups"
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Follow-ups
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Logout
                </button>
              </form>
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
