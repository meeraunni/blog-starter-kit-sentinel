import { type Author } from "./author";

export type Post = {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  coverImage: string;
  author: Author;
  excerpt: string;
  ogImage: {
    url: string;
  };
  content: string;
  preview?: boolean;
};

export type PostSummary = Pick<Post, "slug" | "title" | "date" | "updated" | "excerpt" | "author"> & {
  topics: string[];
};
