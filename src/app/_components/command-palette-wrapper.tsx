import { getAllPosts } from "@/lib/api";
import { getAllTopics, getPostTopics } from "@/lib/post-taxonomy";
import CommandPalette, { type PaletteEntry, type PaletteTopic } from "./command-palette";

export default function CommandPaletteWrapper() {
  const posts: PaletteEntry[] = getAllPosts().map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    topics: getPostTopics(post),
    date: post.date,
  }));

  const topics: PaletteTopic[] = getAllTopics().map((t) => ({
    slug: t.slug,
    label: t.label,
  }));

  return <CommandPalette posts={posts} topics={topics} />;
}
