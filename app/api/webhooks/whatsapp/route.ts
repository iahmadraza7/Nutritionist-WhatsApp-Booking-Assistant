import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/whatsapp/client";
import { processIncomingMessage } from "@/lib/conversation/engine";
import crypto from "crypto";

const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

function verifySignature(payload: string, signature: string): boolean {
  if (!APP_SECRET) return true;
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token && challenge) {
    const result = verifyWebhook(mode, token, challenge);
    if (result) {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const rawBody = await request.text();

  if (APP_SECRET && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{
        value?: {
          messaging_product?: string;
          metadata?: { display_phone_number?: string; phone_number_id?: string };
          contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
          messages?: Array<{
            from?: string;
            id?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
          }>;
        };
        field?: string;
      }>;
    }>;
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      if (value?.messaging_product !== "whatsapp") continue;

      for (const msg of value.messages ?? []) {
        if (msg.type !== "text") continue;
        const text = msg.text?.body?.trim();
        if (!text) continue;

        const from = ((msg.from ?? "").replace(/\D/g, "") || (msg.from ?? "")).trim() || "unknown";
        const contact = value.contacts?.find((c) => c.wa_id === msg.from);
        const name = contact?.profile?.name ?? null;

        try {
          await processIncomingMessage(from, name, text);
        } catch (err) {
          console.error("Process message error:", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
