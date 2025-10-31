import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";

const siteName = "GovCareers";
const description =
  "Discover the latest federal, state, and municipal government jobs with tailored filters for your location.";

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    "government jobs",
    "civil service",
    "public sector careers",
    "state jobs",
    "federal jobs",
  ],
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: siteName,
    description,
    siteName,
    type: "website",
    locale: "en_US",
    url: "https://example.com",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <header className="border-b border-slate-200 bg-white/90 py-4 backdrop-blur">
          <div className="container-grid flex items-center justify-between">
            <div>
              <Link href="/" className="text-xl font-semibold text-slate-900">
                {siteName}
              </Link>
              <p className="text-sm text-slate-600">Public sector careers, in one place.</p>
            </div>
            <nav className="hidden gap-6 text-sm font-medium text-slate-700 sm:flex">
              <Link className="hover:text-slate-900" href="/jobs">
                Find Jobs
              </Link>
              <Link className="hover:text-slate-900" href="/about">
                About
              </Link>
              <Link className="hover:text-slate-900" href="/contact">
                Contact
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6">
          <div className="container-grid flex flex-col justify-between gap-4 text-sm text-slate-600 sm:flex-row">
            <span>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-slate-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-900">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
