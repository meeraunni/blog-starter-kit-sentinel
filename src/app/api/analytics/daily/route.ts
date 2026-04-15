import { NextResponse } from "next/server";
import {
  analyticsReady,
  ensureAnalyticsTables,
  getDailySummary,
  getReportingDate,
  sendDailyAnalyticsEmail,
  storeDailySummary,
} from "@/lib/analytics";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return false;
  }

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!analyticsReady()) {
    return NextResponse.json({ ok: false, error: "Analytics not configured" }, { status: 500 });
  }

  const reportDate = getReportingDate(1);

  await ensureAnalyticsTables();
  const summary = await getDailySummary(reportDate);
  await storeDailySummary(summary);
  await sendDailyAnalyticsEmail(summary);

  return NextResponse.json({ ok: true, summary });
}
