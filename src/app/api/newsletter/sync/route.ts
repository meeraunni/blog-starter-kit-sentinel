import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/api";
import { syncLatestPostToSubscribers } from "@/lib/newsletter";

export async function POST() {
  try {
    const posts = getAllPosts();
    const result = await syncLatestPostToSubscribers(posts[0]);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Newsletter sync failed." }, { status: 500 });
  }
}
