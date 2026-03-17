import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import FaqsForm from "./ui";

export default async function FaqsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const faqs = await prisma.fAQEntry.findMany({
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">FAQs</h1>
      <FaqsForm initialFaqs={faqs} />
    </div>
  );
}

