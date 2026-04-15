import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { Resend } from "resend";

type TopPage = {
  path: string;
  views: number;
  visitors: number;
};

type Summary = {
  date: string;
  pageviews: number;
  uniqueVisitors: number;
  topPages: TopPage[];
};

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  return neon(databaseUrl);
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

function getMailFrom() {
  return process.env.MAIL_FROM_EMAIL || "Sentinel Identity <onboarding@resend.dev>";
}

function getAnalyticsRecipient() {
  return process.env.ANALYTICS_REPORT_TO_EMAIL || process.env.CONTACT_TO_EMAIL || "info@sentinelidentity.ca";
}

function getReportTimeZone() {
  return process.env.REPORT_TIMEZONE || "America/Toronto";
}

export function analyticsReady() {
  return Boolean(process.env.DATABASE_URL);
}

function formatDateInTimeZone(date: Date, timeZone = getReportTimeZone()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function getReportingDate(daysAgo = 1) {
  const now = new Date();
  const shifted = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return formatDateInTimeZone(shifted);
}

export function createVisitorHash(values: {
  ip: string;
  userAgent: string;
  date: string;
}) {
  const normalizedUa = values.userAgent.slice(0, 180);
  return crypto.createHash("sha256").update(`${values.date}:${values.ip}:${normalizedUa}`).digest("hex");
}

export function isBot(userAgent: string) {
  return /bot|crawl|spider|preview|facebookexternalhit|slurp|bingpreview|curl/i.test(userAgent);
}

export async function ensureAnalyticsTables() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS analytics_pageviews (
      id BIGSERIAL PRIMARY KEY,
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      view_date DATE NOT NULL,
      path TEXT NOT NULL,
      slug TEXT,
      visitor_hash TEXT NOT NULL,
      referrer TEXT
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS analytics_pageviews_view_date_idx
    ON analytics_pageviews (view_date)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS analytics_pageviews_path_idx
    ON analytics_pageviews (path)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS analytics_daily_reports (
      report_date DATE PRIMARY KEY,
      pageviews INTEGER NOT NULL,
      unique_visitors INTEGER NOT NULL,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function trackPageView(values: {
  path: string;
  slug?: string | null;
  referrer?: string | null;
  visitorHash: string;
  date: string;
}) {
  const sql = getSql();

  await sql`
    INSERT INTO analytics_pageviews (view_date, path, slug, visitor_hash, referrer)
    VALUES (${values.date}, ${values.path}, ${values.slug || null}, ${values.visitorHash}, ${values.referrer || null})
  `;
}

export async function getDailySummary(reportDate: string): Promise<Summary> {
  const sql = getSql();

  const totals = (await sql`
    SELECT
      COUNT(*)::int AS pageviews,
      COUNT(DISTINCT visitor_hash)::int AS unique_visitors
    FROM analytics_pageviews
    WHERE view_date = ${reportDate}
  `) as Array<{
    pageviews: number;
    unique_visitors: number;
  }>;

  const topPages = (await sql`
    SELECT
      path,
      COUNT(*)::int AS views,
      COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM analytics_pageviews
    WHERE view_date = ${reportDate}
    GROUP BY path
    ORDER BY views DESC, visitors DESC, path ASC
    LIMIT 8
  `) as TopPage[];

  return {
    date: reportDate,
    pageviews: totals[0]?.pageviews || 0,
    uniqueVisitors: totals[0]?.unique_visitors || 0,
    topPages,
  };
}

export async function storeDailySummary(summary: Summary) {
  const sql = getSql();

  await sql`
    INSERT INTO analytics_daily_reports (report_date, pageviews, unique_visitors)
    VALUES (${summary.date}, ${summary.pageviews}, ${summary.uniqueVisitors})
    ON CONFLICT (report_date)
    DO UPDATE SET
      pageviews = EXCLUDED.pageviews,
      unique_visitors = EXCLUDED.unique_visitors,
      delivered_at = NOW()
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendDailyAnalyticsEmail(summary: Summary) {
  const resend = getResend();
  const from = getMailFrom();
  const to = getAnalyticsRecipient();
  const topRows =
    summary.topPages.length > 0
      ? summary.topPages
          .map(
            (page) => `
              <tr>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(page.path)}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${page.views}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${page.visitors}</td>
              </tr>`,
          )
          .join("")
      : `
          <tr>
            <td colspan="3" style="padding:10px;border-bottom:1px solid #e2e8f0;color:#64748b;">No pageviews recorded.</td>
          </tr>`;

  await resend.emails.send({
    from,
    to: [to],
    subject: `Daily Sentinel Identity traffic: ${summary.uniqueVisitors} visitors on ${summary.date}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
        <h1 style="font-size:22px;margin-bottom:8px;">Daily traffic summary</h1>
        <p style="margin-top:0;color:#475569;">Report date: ${escapeHtml(summary.date)} (${escapeHtml(getReportTimeZone())})</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;min-width:180px;">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Unique visitors</div>
            <div style="font-size:28px;font-weight:700;">${summary.uniqueVisitors}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;min-width:180px;">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Pageviews</div>
            <div style="font-size:28px;font-weight:700;">${summary.pageviews}</div>
          </div>
        </div>
        <h2 style="font-size:18px;margin:24px 0 10px;">Top pages</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #cbd5e1;">Page</th>
              <th style="text-align:right;padding:8px 10px;border-bottom:1px solid #cbd5e1;">Views</th>
              <th style="text-align:right;padding:8px 10px;border-bottom:1px solid #cbd5e1;">Visitors</th>
            </tr>
          </thead>
          <tbody>
            ${topRows}
          </tbody>
        </table>
      </div>
    `,
  });
}
