import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";
import markdownToHtml from "@/lib/markdownToHtml";
import { estimateReadingTime, extractTableOfContents } from "@/lib/post-format";
import { getBaseUrl } from "@/lib/site";
import Alert from "@/app/_components/alert";
import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { PostBody } from "@/app/_components/post-body";
import { PostHeader } from "@/app/_components/post-header";
import PostSidebar from "@/app/_components/post-sidebar";

export default async function Post(props: Params) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const content = await markdownToHtml(post.content || "");
  const readingTime = estimateReadingTime(post.content || "");
  const tableOfContents = extractTableOfContents(post.content || "");
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.author?.name || "Sentinel Identity",
    },
    publisher: {
      "@type": "Organization",
      name: "Sentinel Identity",
      url: "https://sentinelidentity.ca",
    },
    mainEntityOfPage: getBaseUrl(`/posts/${post.slug}`),
    image: getBaseUrl(post.ogImage.url),
  };

  return (
    <main>
      <Alert preview={post.preview} />
      <Header />
      <Container>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
        <article className="pb-20 pt-6 lg:pb-24">
          <PostHeader
            title={post.title}
            excerpt={post.excerpt}
            coverImage={post.coverImage}
            date={post.date}
            readingTime={readingTime}
            author={post.author}
          />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <PostBody content={content} />
            <PostSidebar items={tableOfContents} readingTime={readingTime} />
          </div>
        </article>
      </Container>
    </main>
  );
}

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const title = `${post.title} | ${CMS_NAME}`;

  return {
    title,
    description: post.excerpt,
    alternates: {
      canonical: `/posts/${post.slug}`,
    },
    openGraph: {
      title,
      description: post.excerpt,
      type: "article",
      url: getBaseUrl(`/posts/${post.slug}`),
      images: [post.ogImage.url],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.excerpt,
      images: [post.ogImage.url],
    },
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
