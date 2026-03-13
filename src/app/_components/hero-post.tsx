import Link from "next/link";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: {
    name: string;
    picture: string;
  };
  slug: string;
};

export function HeroPost({
  title,
  coverImage,
  date,
  excerpt,
  slug,
}: Props) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-8 md:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="mb-8 overflow-hidden rounded-2xl shadow-sm">
            <CoverImage title={title} src={coverImage} slug={slug} priority />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-sm text-neutral-500">
              <DateFormatter dateString={date} />
            </div>

            <h2 className="text-3xl font-semibold leading-tight text-black md:text-4xl">
              <Link href={`/posts/${slug}`} className="hover:text-blue-700">
                {title}
              </Link>
            </h2>

            <p className="mt-4 text-lg leading-8 text-neutral-700">
              {excerpt}
            </p>

            <div className="mt-6">
              <Link
                href={`/posts/${slug}`}
                className="inline-flex items-center rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Read article
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white shadow-sm">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-100">
              Consulting
            </p>
            <h3 className="text-2xl font-semibold">
              Book a tenant review
            </h3>
            <p className="mt-3 text-base leading-7 text-blue-50">
              One-on-one help with Microsoft Entra, Conditional Access,
              MFA strategy, and tenant hardening.
            </p>

            <a
              href="#assessment-form"
              className="mt-5 inline-flex items-center rounded-md bg-white px-5 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Request assessment
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
