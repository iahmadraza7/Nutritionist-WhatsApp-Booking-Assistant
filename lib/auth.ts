import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "nutritionist_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(adminId: string): Promise<void> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await prisma.session.create({ data: { adminId, token, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    // For this MVP we keep the cookie non-httpOnly and non-secure
    // so that it works reliably over plain HTTP on the VPS.
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<{ adminId: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { admin: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return { adminId: session.adminId, email: session.admin.email };
}

export async function login(email: string, password: string): Promise<boolean> {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return false;
  const ok = await verifyPassword(password, admin.password);
  if (!ok) return false;
  await createSession(admin.id);
  return true;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
