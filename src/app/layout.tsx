import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";
import { MainNavigation } from "@/components/main-navigation";

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
  return (
    <html lang="en" className="h-full bg-slate-50 scroll-smooth">
      <body className="flex min-h-screen flex-col font-sans antialiased text-slate-800">
        {/* Header */}
            <header className="border-b bg-blue-700 text-white shadow-sm">
              <div className="container-grid flex items-center justify-between py-3">
                <Link href="/" className="text-xl font-semibold">
                  Grant Directory
                </Link>
                <p className="text-sm opacity-80">Verified government funding opportunities</p>
                <Link
                  href="/grants"
                  className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-md hover:bg-blue-50"
                >
                  Search Grants
                </Link>
              </div>
            </header>
        {/* Main content */}
              <section className="bg-blue-50 border-b border-blue-100 py-12">
                <div className="container-grid text-center space-y-4">
                  <h1 className="text-3xl font-bold text-blue-900">Find Government Grants</h1>
                  <p className="text-slate-600">
                    Explore verified funding opportunities from federal and state agencies.
                  </p>
                  <Link
                    href="/grants"
                    className="inline-block bg-blue-700 text-white font-medium px-6 py-2 rounded-md hover:bg-blue-800"
                  >
                    Start Searching
                  </Link>
                </div>
              </section>

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
