import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";
import markdownToHtml from "@/lib/markdownToHtml";
import { estimateReadingTime, extractTableOfContents } from "@/lib/post-format";
import { getBaseUrl } from "@/lib/site";
import { getRelatedPosts } from "@/lib/post-taxonomy";
import Alert from "@/app/_components/alert";
import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { PostBody } from "@/app/_components/post-body";
import { PostHeader } from "@/app/_components/post-header";
import PostSidebar from "@/app/_components/post-sidebar";
import Link from "next/link";

export default async function Post(props: Params) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);
  const allPosts = getAllPosts();

  if (!post) {
    return notFound();
  }

  const content = await markdownToHtml(post.content || "");
  const readingTime = estimateReadingTime(post.content || "");
  const tableOfContents = extractTableOfContents(post.content || "");
  const relatedPosts = getRelatedPosts(allPosts, post, 3);
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
          {relatedPosts.length > 0 && (
            <section className="mx-auto mt-16 max-w-5xl border-t border-stone-200 pt-12">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">Related reading</p>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <article
                    key={related.slug}
                    className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                  >
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      <Link href={`/posts/${related.slug}`} className="transition hover:text-cyan-900">
                        {related.title}
                      </Link>
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{related.excerpt}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
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
