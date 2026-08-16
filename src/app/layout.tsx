import Footer from "@/app/_components/footer";
import VisitorTracker from "@/app/_components/visitor-tracker";
import CommandPaletteWrapper from "@/app/_components/command-palette-wrapper";
import { CMS_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { Manrope, Sora, JetBrains_Mono } from "next/font/google";
import cn from "classnames";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${CMS_NAME} | Microsoft Entra Blog`,
    template: `%s | ${CMS_NAME}`,
  },
  description:
    "Independent long-form technical writing on Microsoft Entra, Conditional Access, authentication, identity architecture, DNS, and tenant hardening.",
  keywords: [
    "Microsoft Entra",
    "Conditional Access",
    "Microsoft identity",
    "passkeys",
    "Azure identity",
    "technical blog",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: getSiteUrl(),
    title: `${CMS_NAME} | Microsoft Entra Blog`,
    description:
      "Independent long-form technical writing on Microsoft Entra, Conditional Access, authentication, identity architecture, DNS, and tenant hardening.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${CMS_NAME} | Microsoft Entra Blog`,
    description:
      "Independent long-form technical writing on Microsoft Entra, Conditional Access, authentication, identity architecture, DNS, and tenant hardening.",
    images: ["/opengraph-image"],
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
    founder: {
      "@type": "Person",
      name: "MU.A",
      jobTitle: "Microsoft 365 / Entra Engineer",
      url: "https://sentinelidentity.ca/author/m-u",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sentinel Identity",
    url: "https://sentinelidentity.ca",
    description:
      "Independent long-form technical writing on Microsoft Entra, authentication, Conditional Access, DNS, and tenant hardening.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://sentinelidentity.ca/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        <meta name="theme-color" content="#fbfaf7" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        {/* Force-clear any legacy theme preference from prior visits, so a
            user who had "system" or "dark" stored doesn't get auto-dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.classList.remove('dark');localStorage.removeItem('nextjs-blog-starter-theme');}catch(e){}`,
          }}
        />
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
          mono.variable,
          "min-h-screen antialiased",
        )}
      >
        <VisitorTracker />
        <CommandPaletteWrapper />
        <div className="min-h-screen">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
