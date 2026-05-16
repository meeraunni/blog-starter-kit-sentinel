import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPostBySlug } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";
import markdownToHtml from "@/lib/markdownToHtml";
import { estimateReadingTime, extractTableOfContents } from "@/lib/post-format";
import { getBaseUrl } from "@/lib/site";
import {
  getAdjacentPosts,
  getPostTopics,
  getRelatedPosts,
  getTopicByLabel,
} from "@/lib/post-taxonomy";
import Alert from "@/app/_components/alert";
import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { PostBody } from "@/app/_components/post-body";
import { PostHeader } from "@/app/_components/post-header";
import PostSidebar from "@/app/_components/post-sidebar";
import Breadcrumbs from "@/app/_components/breadcrumbs";
import ShareMenu from "@/app/_components/share-menu";
import PrevNextNav from "@/app/_components/prev-next-nav";
import ArticleFeedback from "@/app/_components/article-feedback";
import CopyCodeButtons from "@/app/_components/copy-code";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

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
  const { previous, next } = getAdjacentPosts(allPosts, post.slug);

  const postTopics = getPostTopics(post);
  const primaryTopicLabel = postTopics[0] ?? "Microsoft Entra";
  const primaryTopic = getTopicByLabel(primaryTopicLabel);
  const postUrl = getBaseUrl(`/posts/${post.slug}`);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "Sentinel Identity Editorial Team",
      url: getBaseUrl("/about"),
    },
    publisher: {
      "@type": "Organization",
      name: "Sentinel Identity",
      url: "https://sentinelidentity.ca",
    },
    mainEntityOfPage: postUrl,
    image: getBaseUrl(post.ogImage.url),
    articleSection: primaryTopicLabel,
    keywords: postTopics.join(", "),
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

        <article className="pb-24 pt-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: primaryTopicLabel, href: `/topics/${primaryTopic.slug}` },
              { label: post.title },
            ]}
            className="mt-2 flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
          />

          <PostHeader
            title={post.title}
            excerpt={post.excerpt}
            coverImage={post.coverImage}
            date={post.date}
            readingTime={readingTime}
            author={post.author}
          />

          <div className="mx-auto -mt-2 mb-10 flex max-w-5xl flex-col gap-4 px-1 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 text-xs">
              {postTopics.map((topic) => {
                const t = getTopicByLabel(topic);
                return (
                  <Link
                    key={topic}
                    href={`/topics/${t.slug}`}
                    className="rounded-full border border-stone-300 bg-white px-3 py-1 font-medium uppercase tracking-[0.16em] text-slate-600 hover:border-slate-900 hover:text-slate-950"
                  >
                    {topic}
                  </Link>
                );
              })}
            </div>
            <ShareMenu title={post.title} url={postUrl} />
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div>
              <PostBody content={content} />
              <CopyCodeButtons />
              <ArticleFeedback slug={post.slug} />
              <PrevNextNav previous={previous} next={next} />
            </div>
            <PostSidebar
              items={tableOfContents}
              readingTime={readingTime}
              topicLabel={primaryTopicLabel}
              topicSlug={primaryTopic.slug}
            />
          </div>

          {relatedPosts.length > 0 && (
            <section className="mx-auto mt-20 max-w-5xl border-t border-stone-200 pt-12">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">Related reading</p>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <article
                    key={related.slug}
                    className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:border-slate-900 hover:shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
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
  return posts.map((post) => ({ slug: post.slug }));
}
