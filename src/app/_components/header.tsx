import Link from "next/link";

export default function Header() {
  return (
    <header className="mb-12">
      <h1 className="text-3xl font-bold tracking-tight">
        <Link href="/" className="hover:underline">
          Sentinel Identity
        </Link>
      </h1>

      <p className="mt-2 text-sm text-neutral-600">
        Identity Engineering Notes
      </p>
    </header>
  );
}
