import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/api";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sentinelidentity.ca";
  const posts = getAllPosts();

  const staticRoutes = [
    "",
    "/archive",
    "/about",
    "/privacy",
    "/terms",
    "/cookies",
    "/editorial-policy",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const postRoutes = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
  }));

  return [...staticRoutes, ...postRoutes];
}
