import Link from "next/link";
import { getBaseUrl } from "@/lib/site";

export type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
  className?: string;
};

export default function Breadcrumbs({ items, className }: Props) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: getBaseUrl(item.href) } : {}),
    })),
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={
        className ??
        "flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-slate-900">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-slate-800">
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className="mx-1 text-slate-400">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
