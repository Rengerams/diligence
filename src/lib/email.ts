import { randomBytes } from "node:crypto";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
}

export function emailSender(): { name: string; email: string } {
  return {
    name: process.env.EMAIL_FROM_NAME ?? "Stichting Diligence Almere",
    email: process.env.EMAIL_FROM ?? "info@diligence-almere.nl",
  };
}

export function newUnsubscribeToken(): string {
  return randomBytes(24).toString("hex");
}

export function unsubscribeUrl(token: string): string {
  return `${appUrl()}/uitschrijven?token=${encodeURIComponent(token)}`;
}

type SendResult =
  | { status: "demo"; error?: undefined }
  | { status: "sent"; providerMessageId: string | null; error?: undefined }
  | { status: "failed"; error: string };

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { status: "demo" };
  }

  const sender = emailSender();
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { status: "failed", error: `Brevo ${response.status}: ${body.slice(0, 300)}` };
    }

    const data = (await response.json()) as { messageId?: string };
    return { status: "sent", providerMessageId: data.messageId ?? null };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Onbekende verzendfout",
    };
  }
}
