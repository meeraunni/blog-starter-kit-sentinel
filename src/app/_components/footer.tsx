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
    heading: "Reference",
    links: [
      { href: "/topics/conditional-access", label: "Conditional Access" },
      { href: "/topics/passkeys", label: "Passkeys & FIDO2" },
      { href: "/topics/authentication", label: "Authentication" },
      { href: "/topics/domains-and-dns", label: "Domains & DNS" },
      { href: "/topics/tenant-operations", label: "Tenant operations" },
    ],
  },
  {
    heading: "Site",
    links: [
      { href: "/about", label: "About" },
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
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-[#fbfaf7]">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2.6fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">Sentinel Identity</p>
            <h2 className="mt-3 max-w-md text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Engineering-grade reference for Microsoft Entra and Microsoft 365.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
              Long-form technical articles for the Microsoft identity practitioner: Conditional Access, passkeys,
              hybrid identity, tenant troubleshooting, and the protocols underneath.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="mailto:info@sentinelidentity.ca"
                className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-950"
              >
                info@sentinelidentity.ca
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-900"
              >
                Contact the editor
              </Link>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {navColumns.map((column) => (
              <div key={column.heading}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{column.heading}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {column.links.map((link) =>
                    "external" in link && link.external ? (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className="transition hover:text-slate-950"
                          rel="noopener"
                        >
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
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-stone-200 pt-6 text-xs uppercase tracking-[0.2em] text-slate-400 md:flex-row md:items-center">
          <p>© {year} Sentinel Identity. All rights reserved.</p>
          <p className="text-[0.65rem] tracking-[0.18em] text-slate-400">
            Microsoft, Microsoft Entra, Microsoft 365, and Azure are trademarks of Microsoft Corporation. This
            site is not affiliated with Microsoft.
          </p>
        </div>
      </div>
    </footer>
  );
}
