import { NextResponse } from "next/server";
import { sendConsultingRequestEmail } from "@/lib/newsletter";

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = sanitize(formData.get("name"));
  const company = sanitize(formData.get("company"));
  const email = sanitize(formData.get("email"));
  const challenge = sanitize(formData.get("challenge"));

  if (!name || !email || !challenge) {
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
      email,
    });
    return NextResponse.redirect(new URL("/thanks?form=assessment&status=error", request.url));
  }

  return NextResponse.redirect(new URL("/thanks?form=assessment&status=success", request.url));
}
