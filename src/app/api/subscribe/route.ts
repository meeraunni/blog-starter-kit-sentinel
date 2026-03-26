import { NextResponse } from "next/server";
import {
  createTransporter,
  getContactInbox,
  getEmailFrom,
  getMailerConfigError,
  isMailerConfigured,
} from "@/lib/mailer";

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

  if (!isMailerConfigured()) {
    return NextResponse.json(
      { error: getMailerConfigError() },
      { status: 500 },
    );
  }

  const transporter = createTransporter();
  const inbox = getContactInbox();
  const from = getEmailFrom();

  await transporter.sendMail({
    to: inbox,
    from,
    replyTo: email,
    subject: "New Sentinel Identity subscriber",
    text: [
      "A new blog subscriber signed up.",
      "",
      `Name: ${name || "Not provided"}`,
      `Email: ${email}`,
    ].join("\n"),
  });

  await transporter.sendMail({
    to: email,
    from,
    replyTo: inbox,
    subject: "You are on the Sentinel Identity update list",
    text: [
      `Hi ${name || "there"},`,
      "",
      "Thanks for subscribing to Sentinel Identity.",
      "You will receive updates when new blog posts are published.",
      "",
      "Sentinel Identity",
      inbox,
    ].join("\n"),
  });

  return NextResponse.json({ ok: true });
}
