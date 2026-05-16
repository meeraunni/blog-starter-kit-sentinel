import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

let schemaReady = false;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }
  return neon(databaseUrl);
}

async function ensureSchema() {
  if (schemaReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS article_feedback (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL,
      helpful BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS article_feedback_slug_idx ON article_feedback (slug)`;
  schemaReady = true;
}

function sanitizeSlug(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 200).replace(/[^a-z0-9-_/]/gi, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: unknown; helpful?: unknown };
    const slug = sanitizeSlug(body.slug);
    const helpful = body.helpful === true || body.helpful === "true";

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
    }

    // If no DB configured, accept silently so the UI still feels responsive
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: true, stored: false });
    }

    await ensureSchema();
    const sql = getSql();
    await sql`INSERT INTO article_feedback (slug, helpful) VALUES (${slug}, ${helpful})`;

    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error("Feedback submission failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
