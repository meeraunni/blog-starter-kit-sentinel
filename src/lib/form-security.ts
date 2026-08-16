import { headers } from "next/headers";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function cleanFormValue(value: unknown, maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function isValidEmail(email: string) {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

export async function isTrustedFormRequest(request: Request) {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }

  const forwardedFor = requestHeaders.get("x-forwarded-for") || "unknown";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";
  const key = `${ip}:${new URL(request.url).pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}
