import Image from "next/image";
import Link from "next/link";

export default function HomeHero({ postCount }: { postCount: number }) {
  return (
    <section className="hub-hero journal-width">
      <div className="hub-intro">
        <div>
          <p className="eyebrow">Microsoft identity. Real-world questions.</p>
          <h1>Make sense of what’s next.</h1>
          <p>
            Guides, ideas, and troubleshooting for the people behind every
            successful sign-in.
          </p>
        </div>
        <a href="#articles" className="hub-library-link">
          Explore {postCount} articles <span aria-hidden="true">↓</span>
        </a>
      </div>
      <article className="hub-feature">
        <Link
          href="/posts/external-idp-passkeys-microsoft-365"
          className="hub-feature-image"
          aria-label="Read about external identity provider passkeys for Microsoft 365"
        >
          <Image
            src="/assets/editorial/passkeys.webp"
            alt="Editorial illustration of security keys beside a laptop on a blue desk"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 700px"
          />
          <span className="image-credit">Editorial illustration</span>
        </Link>
        <div className="hub-feature-copy">
          <div className="feature-label">
            <span>Featured guide</span>
            <span>Passkeys &amp; authentication</span>
          </div>
          <h2>
            <Link href="/posts/external-idp-passkeys-microsoft-365">
              Your identity provider.
              <br />
              Your passkeys.
              <br />
              <span>Your Microsoft apps.</span>
            </Link>
          </h2>
          <p>
            What external IdP passkeys mean for Microsoft 365—and the brokers,
            browsers, and rollout details to check before you enable them.
          </p>
          <div className="feature-byline">
            <span className="byline-avatar">MU</span>
            <span>
              MU.A <span className="byline-date">· October 1, 2026</span>
            </span>
          </div>
          <Link
            href="/posts/external-idp-passkeys-microsoft-365"
            className="feature-cta"
          >
            Read the guide <span aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
      <nav className="hub-quick-topics" aria-label="Explore popular topics">
        <span>Explore</span>
        <Link href="/topics/microsoft-entra">Microsoft Entra</Link>
        <Link href="/topics/conditional-access">Conditional Access</Link>
        <Link href="/topics/passkeys">Passkeys</Link>
        <Link href="/topics/active-directory">Active Directory</Link>
        <Link href="/topics/tenant-operations">Microsoft 365</Link>
        <Link href="/topics">All topics ↗</Link>
      </nav>
    </section>
  );
}
