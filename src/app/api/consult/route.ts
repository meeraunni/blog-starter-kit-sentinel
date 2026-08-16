import { NextResponse } from "next/server";
import { sendConsultingRequestEmail } from "@/lib/newsletter";
import { cleanFormValue, isTrustedFormRequest, isValidEmail } from "@/lib/form-security";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = cleanFormValue(formData.get("name"), 100);
  const company = cleanFormValue(formData.get("company"), 160);
  const email = cleanFormValue(formData.get("email"), 254).toLowerCase();
  const challenge = cleanFormValue(formData.get("challenge"), 5000);
  const honeypot = cleanFormValue(formData.get("website"), 120);

  if (honeypot) {
    return NextResponse.redirect(new URL("/thanks?form=assessment&status=success", request.url));
  }

  if (!name || !isValidEmail(email) || !challenge || !(await isTrustedFormRequest(request))) {
    return NextResponse.redirect(new URL("/thanks?form=assessment&status=error", request.url));
  }

  try {
    await sendConsultingRequestEmail({
      name,
      company,
      email,
      challenge,
    });
  } catch (error) {
    console.error("Consult form delivery failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(new URL("/thanks?form=assessment&status=error", request.url));
  }

  return NextResponse.redirect(new URL("/thanks?form=assessment&status=success", request.url));
}
