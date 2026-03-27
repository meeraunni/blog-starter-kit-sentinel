import { NextResponse } from "next/server";
import { sendFormSubmission } from "@/lib/formsubmit";

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = sanitize(body.email);
  const name = sanitize(body.name);

  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      { status: 400 },
    );
  }

  try {
    await sendFormSubmission({
      name: name || "Subscriber",
      email,
      _subject: "New Sentinel Identity subscriber",
      _replyto: email,
      _template: "table",
      _captcha: "false",
    });
  } catch {
    return NextResponse.json(
      { error: "We could not complete your subscription right now. Please try again shortly." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
