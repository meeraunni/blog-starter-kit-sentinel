import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/api";
import { syncLatestPostToSubscribers } from "@/lib/newsletter";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { slug?: string } | null;
    const slug = body?.slug?.trim();
    const post = slug ? getAllPosts().find((candidate) => candidate.slug === slug) : undefined;
    if (!post) {
      return NextResponse.json({ error: "A valid article slug is required." }, { status: 400 });
    }
    const result = await syncLatestPostToSubscribers(post);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Newsletter sync failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Newsletter sync failed." }, { status: 500 });
  }
}
