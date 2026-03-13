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
      <div className="grid gap-8 md:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-6">
            <CoverImage title={title} src={coverImage} slug={slug} priority />
          </div>

          <div className="border border-neutral-200 bg-white p-6">
            <div className="mb-3 text-sm text-neutral-500">
              <DateFormatter dateString={date} />
            </div>

            <h2 className="text-3xl font-semibold leading-tight text-black md:text-4xl">
              <Link href={`/posts/${slug}`} className="hover:underline">
                {title}
              </Link>
            </h2>

            <p className="mt-4 text-lg leading-8 text-neutral-700">
              {excerpt}
            </p>

            <div className="mt-6">
              <Link
                href={`/posts/${slug}`}
                className="inline-flex items-center text-sm font-medium text-black underline underline-offset-4"
              >
                Read article
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="border border-neutral-200 bg-neutral-50 p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Services
            </p>
            <h3 className="text-2xl font-semibold text-black">
              Identity security consulting
            </h3>
            <p className="mt-3 text-base leading-7 text-neutral-700">
              One-on-one support for Conditional Access design, Microsoft Entra reviews,
              tenant hardening, MFA strategy, and identity troubleshooting.
            </p>
          </div>

          <div className="border border-neutral-200 bg-white p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Featured focus
            </p>
            <h3 className="text-2xl font-semibold text-black">
              Microsoft Entra and Conditional Access
            </h3>
            <p className="mt-3 text-base leading-7 text-neutral-700">
              Practical write-ups and implementation guidance for admins, analysts,
              and small to mid-sized organizations.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
