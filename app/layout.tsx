import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nutritionist WhatsApp Booking",
  description: "AI-powered WhatsApp assistant for nutritionist",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
