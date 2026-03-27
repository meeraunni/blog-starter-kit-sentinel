import { NextResponse } from "next/server";
import { sendFormSubmission } from "@/lib/formsubmit";

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json();

  const name = sanitize(body.name);
  const company = sanitize(body.company);
  const email = sanitize(body.email);
  const challenge = sanitize(body.challenge);

  if (!name || !email || !challenge) {
    return NextResponse.json(
      { error: "Name, email, and project details are required." },
      { status: 400 },
    );
  }

  try {
    await sendFormSubmission({
      name,
      company,
      email,
      challenge,
      _subject: `Sentinel Identity consulting request from ${name}`,
      _replyto: email,
      _template: "table",
    });
  } catch {
    return NextResponse.json(
      { error: "We could not send your request right now. Please try again shortly." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
