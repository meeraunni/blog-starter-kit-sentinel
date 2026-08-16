import { NextResponse } from "next/server";
import { readNewsletterToken } from "@/lib/newsletter-token";
import { registerSubscriber, sendSubscriptionConfirmation } from "@/lib/newsletter";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const email = readNewsletterToken(token, "confirm");
  if (!email) return NextResponse.redirect(new URL("/thanks?form=subscribe&status=error", request.url));

  try {
    const subscriber = await registerSubscriber(email);
    await sendSubscriptionConfirmation(subscriber);
    return NextResponse.redirect(new URL("/thanks?form=subscribe&status=confirmed", request.url));
  } catch (error) {
    console.error("Subscription confirmation failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(new URL("/thanks?form=subscribe&status=error", request.url));
  }
}
