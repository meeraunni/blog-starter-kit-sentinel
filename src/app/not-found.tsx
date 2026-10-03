import Link from "next/link";
import Header from "@/app/_components/header";
export default function NotFound() {
  return (
    <main>
      <Header />
      <section className="policy-page journal-width">
        <p className="eyebrow">404 / Page not found</p>
        <h1>
          This page isn’t
          <br />
          in the notebook.
        </h1>
        <p>
          The link may be outdated or the address may be mistyped. Try the{" "}
          <Link href="/archive">article archive</Link>, browse by{" "}
          <Link href="/topics">topic</Link>, or{" "}
          <Link href="/contact">report a broken link</Link>.
        </p>
        <Link href="/" className="journal-text-link">
          Back to the publication →
        </Link>
      </section>
    </main>
  );
}
