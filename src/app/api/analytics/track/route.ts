import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  analyticsReady,
  createVisitorHash,
  ensureAnalyticsTables,
  getReportingDate,
  isBot,
  trackPageView,
} from "@/lib/analytics";

export const runtime = "nodejs";

function normalizePath(path: string) {
  if (!path.startsWith("/")) {
    return "/";
  }

  return path.slice(0, 180);
}

function getReferrerPath(referrerHeader: string) {
  if (!referrerHeader) {
    return null;
  }

  try {
    return new URL(referrerHeader).pathname;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!analyticsReady()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  const path = normalizePath(body?.path || "/");
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") || "";

  if (!userAgent || isBot(userAgent)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const forwardedFor = headerList.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";
  const reportDate = getReportingDate(0);
  const visitorHash = createVisitorHash({
    ip,
    userAgent,
    date: reportDate,
  });
  const referrer = getReferrerPath(headerList.get("referer") || "");
  const slug = path.startsWith("/posts/") ? path.replace("/posts/", "") : null;

  await ensureAnalyticsTables();
  await trackPageView({
    path,
    slug,
    referrer,
    visitorHash,
    date: reportDate,
  });

  return NextResponse.json({ ok: true });
}
