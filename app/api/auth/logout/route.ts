import { NextRequest, NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await logout();
  const url = new URL("/admin/login", request.nextUrl.origin);
  return NextResponse.redirect(url, 303);
}
