import Link from "next/link";

const navColumns = [
  {
    heading: "Read",
    links: [
      { href: "/", label: "Latest articles" },
      { href: "/archive", label: "Archive" },
      { href: "/topics", label: "Topics" },
      { href: "/feed.xml", label: "RSS feed", external: true },
    ],
  },
  {
    heading: "Topics",
    links: [
      { href: "/topics/conditional-access", label: "Conditional Access" },
      { href: "/topics/passkeys", label: "Passkeys & FIDO2" },
      { href: "/topics/authentication", label: "Authentication" },
      { href: "/topics/domains-and-dns", label: "Domains & DNS" },
    ],
  },
  {
    heading: "Site",
    links: [
      { href: "/about", label: "About" },
      { href: "/consulting", label: "Consulting" },
      { href: "/editorial-policy", label: "Editorial policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms of Use" },
      { href: "/cookies", label: "Cookies" },
      { href: "/affiliate-disclosure", label: "Affiliate disclosure" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-[#fbfaf7]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {navColumns.map((column) => (
            <div key={column.heading}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {column.links.map((link) =>
                  "external" in link && link.external ? (
                    <li key={link.href}>
                      <a href={link.href} className="transition hover:text-slate-950" rel="noopener">
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link href={link.href} className="transition hover:text-slate-950">
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-stone-200 pt-6 text-xs text-slate-500 md:flex-row md:items-center">
          <p>
            © {year} Sentinel Identity ·{" "}
            <a href="mailto:info@sentinelidentity.ca" className="hover:text-slate-900">
              info@sentinelidentity.ca
            </a>
          </p>
          <p className="text-[0.7rem] text-slate-400">
            Microsoft, Microsoft Entra, Microsoft 365, and Azure are trademarks of Microsoft Corporation. This site is not affiliated with Microsoft.
          </p>
        </div>
      </div>
    </footer>
  );
}
