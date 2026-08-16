import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/api";
import { getAllTopics } from "@/lib/post-taxonomy";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sentinelidentity.ca";
  const posts = getAllPosts();
  const topics = getAllTopics();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/archive`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/topics`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/consulting`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/editorial-policy`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/affiliate-disclosure`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/cookies`, changeFrequency: "yearly", priority: 0.4 },
  ];

  const topicRoutes: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: `${baseUrl}/topics/${topic.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: new Date(post.updated || post.date),
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  return [...staticRoutes, ...topicRoutes, ...postRoutes];
}
