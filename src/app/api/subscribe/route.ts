import { NextResponse } from "next/server";
import { registerSubscriber, sendSubscriptionConfirmation } from "@/lib/newsletter";

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = sanitize(formData.get("email"));
  const name = sanitize(formData.get("name"));

  if (!email) {
    return NextResponse.redirect(new URL("/thanks?form=subscribe&status=error", request.url));
  }

  try {
    const subscriber = await registerSubscriber(email, name);
    await sendSubscriptionConfirmation(subscriber);
  } catch {
    return NextResponse.redirect(new URL("/thanks?form=subscribe&status=error", request.url));
  }

  return NextResponse.redirect(new URL("/thanks?form=subscribe&status=success", request.url));
}
