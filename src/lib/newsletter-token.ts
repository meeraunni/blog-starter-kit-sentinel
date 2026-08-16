import { createHmac, timingSafeEqual } from "node:crypto";

type TokenPurpose = "confirm" | "unsubscribe";

function getSecret() {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("NEWSLETTER_TOKEN_SECRET must contain at least 32 characters");
  }
  return secret;
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createNewsletterToken(email: string, purpose: TokenPurpose, ttlDays = 2) {
  const payload = encode(JSON.stringify({
    email: email.trim().toLowerCase(),
    purpose,
    expiresAt: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
  }));
  return `${payload}.${sign(payload)}`;
}

export function readNewsletterToken(token: string, purpose: TokenPurpose) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      purpose?: TokenPurpose;
      expiresAt?: number;
    };
    if (!parsed.email || parsed.purpose !== purpose || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed.email;
  } catch {
    return null;
  }
}
