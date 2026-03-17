const WHATSAPP_API = "https://graph.facebook.com";

export async function sendWhatsAppMessage(
  to: string,
  text: string,
  options?: { previewUrl?: boolean }
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";

  if (!token || !phoneId) {
    console.error("WhatsApp credentials not configured");
    return false;
  }

  const normalizedPhone = to.replace(/\D/g, "");
  const recipient = normalizedPhone.endsWith("@s.whatsapp.net")
    ? normalizedPhone
    : `${normalizedPhone}@s.whatsapp.net`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone.replace("@s.whatsapp.net", ""),
    type: "text",
    text: {
      preview_url: options?.previewUrl ?? false,
      body: text,
    },
  };

  const res = await fetch(`${WHATSAPP_API}/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp send error:", res.status, err);
    return false;
  }

  return true;
}

export function verifyWebhook(mode: string, token: string, challenge: string): string | null {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token === verifyToken) {
    return challenge;
  }
  return null;
}
