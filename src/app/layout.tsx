import Footer from "@/app/_components/footer";
import NewsletterSync from "@/app/_components/newsletter-sync";
import { CMS_NAME, HOME_OG_IMAGE_URL } from "@/lib/constants";
import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Sora } from "next/font/google";
import cn from "classnames";
import { ThemeSwitcher } from "./_components/theme-switcher";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: `${CMS_NAME} | Microsoft Entra Blog`,
    template: `%s | ${CMS_NAME}`,
  },
  description:
    "Independent long-form technical writing on Microsoft Entra, Conditional Access, authentication, identity architecture, DNS, and tenant hardening.",
  openGraph: {
    images: [HOME_OG_IMAGE_URL],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sentinel Identity",
    url: "https://sentinelidentity.ca",
    email: "info@sentinelidentity.ca",
    sameAs: ["https://sentinelidentity.ca"],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sentinel Identity",
    url: "https://sentinelidentity.ca",
    description:
      "Independent long-form technical writing on Microsoft Entra, authentication, Conditional Access, DNS, and tenant hardening.",
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9915553948229076"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link
          rel="mask-icon"
          href="/favicon/safari-pinned-tab.svg"
          color="#000000"
        />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="msapplication-config"
          content="/favicon/browserconfig.xml"
        />
        <meta name="theme-color" content="#020617" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className={cn(
          manrope.variable,
          sora.variable,
          "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_22%,#f8fafc_100%)] text-slate-700 antialiased",
        )}
      >
        <NewsletterSync />
        <ThemeSwitcher />
        <div className="min-h-screen">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
