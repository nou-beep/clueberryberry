/**
 * Email delivery.
 *
 * This build has no mail transport configured, and inventing one would mean
 * showing "check your inbox" for a message that was never sent. Instead the
 * link is logged on the server and returned to the caller so the interface can
 * show it honestly. Configure `MAIL_WEBHOOK_URL` to POST the message to a real
 * sender; the shape is `{ to, subject, text, url }`.
 */

export type Delivery = {
  deliveredBy: "webhook" | "none";
  url: string;
};

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  );
}

async function send(
  to: string,
  subject: string,
  text: string,
  url: string
): Promise<Delivery> {
  const webhook = process.env.MAIL_WEBHOOK_URL;
  if (!webhook) {
    // Server-side only; never surfaced to other users.
    console.info(`[mail:not-configured] ${subject} for ${to}: ${url}`);
    return { deliveredBy: "none", url };
  }
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, subject, text, url }),
    });
    return { deliveredBy: "webhook", url };
  } catch (error) {
    console.error("[mail:failed]", error);
    return { deliveredBy: "none", url };
  }
}

export function verificationUrl(token: string): string {
  return `${baseUrl()}/en/account/verify?token=${encodeURIComponent(token)}`;
}

export function resetUrl(token: string): string {
  return `${baseUrl()}/en/account/reset?token=${encodeURIComponent(token)}`;
}

export async function deliverVerificationEmail(
  to: string,
  token: string
): Promise<Delivery> {
  const url = verificationUrl(token);
  return send(to, "Confirm your Clueberry address", `Confirm your address: ${url}`, url);
}

export async function deliverPasswordResetEmail(
  to: string,
  token: string
): Promise<Delivery> {
  const url = resetUrl(token);
  return send(to, "Reset your Clueberry password", `Reset your password: ${url}`, url);
}
