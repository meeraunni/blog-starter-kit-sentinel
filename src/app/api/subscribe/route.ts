import { NextResponse } from "next/server";
import { sendSubscriptionVerification } from "@/lib/newsletter";
import { cleanFormValue, isTrustedFormRequest, isValidEmail } from "@/lib/form-security";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = cleanFormValue(formData.get("email"), 254).toLowerCase();
  const name = cleanFormValue(formData.get("name"), 80);
  const honeypot = cleanFormValue(formData.get("website"), 120);
  const consent = formData.get("consent") === "yes";

  if (honeypot) {
    return NextResponse.redirect(new URL("/thanks?form=subscribe&status=pending", request.url));
  }

  if (!consent || !isValidEmail(email) || !(await isTrustedFormRequest(request))) {
    return NextResponse.redirect(new URL("/thanks?form=subscribe&status=error", request.url));
  }

  try {
    await sendSubscriptionVerification({ email, firstName: name || undefined });
  } catch (error) {
    console.error("Subscribe form delivery failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(new URL("/thanks?form=subscribe&status=error", request.url));
  }

  return NextResponse.redirect(new URL("/thanks?form=subscribe&status=pending", request.url));
}
