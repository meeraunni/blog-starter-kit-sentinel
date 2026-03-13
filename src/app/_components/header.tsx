import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-sm font-bold text-white shadow-md shadow-blue-200">
            SI
          </div>

          <div className="flex flex-col">
            <span className="text-2xl font-semibold tracking-tight text-black md:text-3xl">
              Sentinel Identity
            </span>
            <span className="text-sm text-neutral-500 md:text-base">
              Microsoft Identity Blog
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm font-medium text-neutral-700 hover:text-blue-700">
            Articles
          </Link>
          <Link href="/#services" className="text-sm font-medium text-neutral-700 hover:text-blue-700">
            Services
          </Link>
          <Link href="/#assessment-form" className="text-sm font-medium text-neutral-700 hover:text-blue-700">
            Assessment
          </Link>
          <a
            href="mailto:info@sentinelidentity.ca"
            className="text-sm font-medium text-neutral-700 hover:text-blue-700"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
