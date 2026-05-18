import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/app/_components/header";
import Breadcrumbs from "@/app/_components/breadcrumbs";
import DateFormatter from "@/app/_components/date-formatter";
import { getAllAuthors, getAuthorBySlug, personSchema, resolveAuthor } from "@/lib/authors";
import { getAllPosts } from "@/lib/api";
import { getBaseUrl } from "@/lib/site";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllAuthors().map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return {};

  return {
    title: `${author.name} — ${author.title}`,
    description: author.shortBio,
    alternates: { canonical: `/author/${author.slug}` },
    openGraph: {
      title: `${author.name} — ${author.title}`,
      description: author.shortBio,
      url: `/author/${author.slug}`,
      type: "profile",
    },
  };
}

export default async function AuthorPage({ params }: Params) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return notFound();

  const posts = getAllPosts().filter((post) => resolveAuthor(post.author?.name).slug === author.slug);

  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      ...personSchema(author),
      "@id": getBaseUrl(`/author/${author.slug}`),
    },
  };

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-18">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
        />

        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Authors" },
            { label: author.name },
          ]}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-start">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 text-2xl font-semibold tracking-[0.22em] text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            {author.initials}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Author</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
              {author.name}
            </h1>
            <p className="mt-3 text-base font-medium uppercase tracking-[0.18em] text-cyan-800">
              {author.title}
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{author.longBio}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {author.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-stone-300 bg-white px-3 py-1 font-medium uppercase tracking-[0.14em] text-slate-700"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link
                href="/editorial-policy"
                className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 font-medium text-slate-900 transition hover:border-slate-950"
              >
                Editorial standards
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-cyan-900"
              >
                Contact the editor
              </Link>
              {author.url && (
                <a
                  href={author.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 font-medium text-slate-900 transition hover:border-slate-950"
                >
                  External profile
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-14">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Articles by {author.name}
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {posts.length} published
            </span>
          </div>

          <ul className="mt-6 divide-y divide-stone-200 rounded-[1.8rem] border border-stone-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="grid gap-3 px-6 py-6 md:grid-cols-[150px_minmax(0,1fr)] md:px-8"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <DateFormatter dateString={post.date} />
                </div>
                <div>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="text-xl font-semibold leading-tight tracking-[-0.03em] text-slate-950 transition hover:text-cyan-900"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
