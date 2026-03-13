import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-black text-sm font-bold text-white">
            SI
          </div>

          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold tracking-tight text-black">
              Sentinel Identity
            </span>
            <span className="hidden text-neutral-400 md:block">|</span>
            <span className="hidden text-lg text-neutral-700 md:block">
              Microsoft Identity &amp; Security Journal
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
