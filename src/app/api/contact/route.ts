import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/newsletter";

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = sanitize(formData.get("name"));
  const email = sanitize(formData.get("email"));
  const subject = sanitize(formData.get("subject"));
  const message = sanitize(formData.get("message"));
  // Honeypot — bots tend to fill hidden fields. If present, silently succeed.
  const honeypot = sanitize(formData.get("website"));

  if (honeypot) {
    return NextResponse.redirect(new URL("/thanks?form=contact&status=success", request.url));
  }

  if (!name || !email || !message) {
    return NextResponse.redirect(new URL("/thanks?form=contact&status=error", request.url));
  }

  try {
    await sendContactEmail({ name, email, subject, message });
  } catch (error) {
    console.error("Contact form delivery failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      email,
    });
    return NextResponse.redirect(new URL("/thanks?form=contact&status=error", request.url));
  }

  return NextResponse.redirect(new URL("/thanks?form=contact&status=success", request.url));
}
