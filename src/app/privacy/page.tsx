import type { Metadata } from "next";
import Link from "next/link";

const pageTitle = "Privacy Policy";
const pageDescription =
  "Understand how GrantDirectory.org handles the limited information collected when you use our grant discovery tools.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: `${pageTitle} | GrantDirectory.org`,
    description: pageDescription,
  },
};

export default function PrivacyPage() {
  return (
    <div className="bg-white">
      <section className="container-grid py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          <header className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Privacy First
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {pageTitle}
            </h1>
            <p className="text-lg text-slate-600">{pageDescription}</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Overview</h2>
            <p className="text-base text-slate-600">
              GrantDirectory.org helps you research public funding without asking
              for personal information. We do not offer account registration,
              require logins, or run analytics that would allow us to identify you.
              When you browse the directory you stay anonymous to us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Information we collect</h2>
            <p className="text-base text-slate-600">
              Our servers may record standard technical details provided by your
              browser (such as IP address, device type, and referring URL) in
              temporary logs so we can keep the site secure and diagnose errors.
              We do not combine these details with any other data to build
              profiles, and log entries are removed on a rolling basis.
            </p>
            <p className="text-base text-slate-600">
              If you voluntarily reach out through email or the contact form, we
              will use the information you provide solely to respond to your
              message and support your request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Cookies and tracking</h2>
            <p className="text-base text-slate-600">
              We do not use tracking cookies, advertising pixels, or similar
              technologies on the site. Essential session cookies may be used to
              maintain site performance, and they expire automatically. You can
              adjust your browser settings to manage cookies at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Affiliate links and third parties</h2>
            <p className="text-base text-slate-600">
              Some grant listings or resources may contain affiliate links. If you
              choose to use those links, our partners may track referrals to
              attribute commissions. We do not receive personal information from
              those partners. Each affiliate program maintains its own privacy
              policy, so please review their practices before submitting any data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Data security</h2>
            <p className="text-base text-slate-600">
              We follow industry-standard safeguards, including encrypted
              connections (HTTPS) and restricted administrative access, to prevent
              unauthorized access to the site and any communication you send us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Your choices</h2>
            <p className="text-base text-slate-600">
              You may request deletion of emails or other information you have
              shared with us by contacting privacy@grantdirectory.org. For
              affiliate offerings, please contact the partner directly to manage
              your preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Updates</h2>
            <p className="text-base text-slate-600">
              We may update this privacy policy as we add new features or legal
              requirements change. The revision date below reflects the most
              recent update. Significant changes will be highlighted on this page.
            </p>
            <p className="text-sm text-slate-500">Last updated: {new Date().getFullYear()}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Contact</h2>
            <p className="text-base text-slate-600">
              Questions about privacy can be submitted through our{" "}
              <Link href="/contact" className="text-blue-700 hover:text-blue-900">
                contact page
              </Link>
              , and we&apos;ll respond promptly.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
