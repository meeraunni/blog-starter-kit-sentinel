import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/newsletter";
import { cleanFormValue, isTrustedFormRequest, isValidEmail } from "@/lib/form-security";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = cleanFormValue(formData.get("name"), 100);
  const email = cleanFormValue(formData.get("email"), 254).toLowerCase();
  const subject = cleanFormValue(formData.get("subject"), 160);
  const message = cleanFormValue(formData.get("message"), 5000);
  // Honeypot — bots tend to fill hidden fields. If present, silently succeed.
  const honeypot = cleanFormValue(formData.get("website"), 120);

  if (honeypot) {
    return NextResponse.redirect(new URL("/thanks?form=contact&status=success", request.url));
  }

  if (!name || !isValidEmail(email) || !message || !(await isTrustedFormRequest(request))) {
    return NextResponse.redirect(new URL("/thanks?form=contact&status=error", request.url));
  }

  try {
    await sendContactEmail({ name, email, subject, message });
  } catch (error) {
    console.error("Contact form delivery failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(new URL("/thanks?form=contact&status=error", request.url));
  }

  return NextResponse.redirect(new URL("/thanks?form=contact&status=success", request.url));
}
