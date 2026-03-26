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

  const name = sanitize(body.name);
  const company = sanitize(body.company);
  const email = sanitize(body.email);
  const website = sanitize(body.website);
  const challenge = sanitize(body.challenge);

  if (!name || !email || !challenge) {
    return NextResponse.json(
      { error: "Name, email, and project details are required." },
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
    subject: `New Sentinel Identity consulting inquiry from ${name}`,
    text: [
      `Name: ${name}`,
      `Company: ${company || "Not provided"}`,
      `Email: ${email}`,
      `Website: ${website || "Not provided"}`,
      "",
      "Assessment request:",
      challenge,
    ].join("\n"),
  });

  await transporter.sendMail({
    to: email,
    from,
    replyTo: inbox,
    subject: "We received your Sentinel Identity assessment request",
    text: [
      `Hi ${name},`,
      "",
      "Thanks for reaching out to Sentinel Identity.",
      "We received your tenant assessment request and will review it shortly.",
      "",
      "If you need to add context, reply to this email.",
      "",
      "Sentinel Identity",
      inbox,
    ].join("\n"),
  });

  return NextResponse.json({ ok: true });
}
