import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";
import { Menu, type MenuItem } from "@/components/menu";

const siteName = "Grant Directory";
const tagline = "Verified government funding opportunities in one place.";

export const metadata: Metadata = {
  title: {
    default: `${siteName} | Federal & State Grant Search`,
    template: `%s | ${siteName}`,
  },
  description:
    "Discover and filter verified federal, state, and local grant opportunities by agency, category, and location.",
  metadataBase: new URL("https://www.grantdirectory.org"),
  openGraph: {
    title: siteName,
    description:
      "Explore official funding opportunities with advanced filters for state, agency, and purpose.",
    siteName,
    url: "https://www.grantdirectory.org",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description:
      "Find verified government and nonprofit funding opportunities nationwide.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const menuItems: MenuItem[] = [
    { label: "Find Grants", href: "/grants", isPrimary: true },
    { label: "Agencies", href: "/agencies" },
    { label: "Resources", href: "/resources" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <html lang="en" className="h-full bg-slate-50 scroll-smooth">
      <body className="flex min-h-screen flex-col font-sans antialiased text-slate-800">
        {/* Header */}
        <meta name='impact-site-verification' value='5249839a-51c4-4652-9216-0db5276e16b7' />
        <header className="border-b border-blue-100 bg-white/90 shadow-sm backdrop-blur">
          <div className="container-grid space-y-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link href="/" className="text-2xl font-semibold text-blue-700">
                  Grant Directory
                </Link>
                <p className="text-sm text-slate-600">Verified government funding opportunities</p>
              </div>
              <Link
                href="/grants"
                className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Search Grants
              </Link>
            </div>
            <Menu items={menuItems} className="justify-start" />
          </div>
        </header>
        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 text-sm text-slate-600">
          <div className="container-grid flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p>
                &copy; {new Date().getFullYear()} {siteName}. All rights
                reserved.
              </p>
              <p className="text-xs text-slate-500">
                Built to simplify access to public funding.
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-4">
              <Link href="/about" className="hover:text-slate-900">
                About
              </Link>
              <Link href="/resources" className="hover:text-slate-900">
                Resources
              </Link>
              <Link href="/privacy" className="hover:text-slate-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-900">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-slate-900">
                Contact
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
