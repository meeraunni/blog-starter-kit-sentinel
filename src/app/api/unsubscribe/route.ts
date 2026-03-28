import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/newsletter";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", request.url));
  }

  const result = await unsubscribeByToken(token);

  if (!result) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", request.url));
  }

  return NextResponse.redirect(new URL("/unsubscribe?status=success", request.url));
}
