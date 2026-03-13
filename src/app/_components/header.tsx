import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
            SI
          </div>

          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold tracking-tight text-black">
              Sentinel Identity
            </span>
            <span className="hidden text-neutral-400 md:block">|</span>
            <span className="hidden text-lg text-neutral-700 md:block">
              Microsoft Identity Blog
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm font-medium text-neutral-700 hover:text-blue-700">
            Articles
          </Link>
          <Link href="#services" className="text-sm font-medium text-neutral-700 hover:text-blue-700">
            Services
          </Link>
          <Link href="#assessment-form" className="text-sm font-medium text-neutral-700 hover:text-blue-700">
            Assessment
          </Link>
          <Link href="#contact" className="text-sm font-medium text-neutral-700 hover:text-blue-700">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
