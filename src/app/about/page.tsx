import type { Metadata } from "next";
import Script from "next/script";

const pageTitle = "About";
const pageDescription =
  "Learn about GrantDirectory.org's mission to make government funding easier to find, how the directory works, and the team behind it.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: `${pageTitle} | GrantDirectory.org`,
    description: pageDescription,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GrantDirectory.org",
  url: "https://www.grantdirectory.org",
  description:
    "GrantDirectory.org helps nonprofits, municipalities, and entrepreneurs discover and track government grant funding opportunities.",
  logo: "https://www.grantdirectory.org/logo.png",
  sameAs: [
    "https://www.linkedin.com/company/grantdirectory",
    "https://twitter.com/grantdirectory",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "media inquiries",
    email: "press@grantdirectory.org",
  },
};

export default function AboutPage() {
  return (
    <div className="bg-white">
      <Script
        id="about-organization-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <section className="container-grid py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          <header className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Our Story
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Funding transparency for everyone
            </h1>
            <p className="text-lg text-slate-600">{pageDescription}</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Mission</h2>
            <p className="text-base text-slate-600">
              Our mission is to remove the friction that individuals, nonprofits, and
              local governments face when searching for public funding. We aggregate
              federal, state, and municipal grant opportunities into a unified
              directory so you can focus on impact instead of paperwork.
            </p>
            <p className="text-base text-slate-600">
              Every feature we ship is guided by transparency and accessibility. We
              translate dense program requirements into plain language and deliver
              tools that help you stay organized from discovery through submission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">How the directory works</h2>
            <p className="text-base text-slate-600">
              GrantDirectory.org continuously monitors official sources—such as
              Grants.gov, state portals, and trusted municipal feeds—and normalizes
              each listing into a searchable format. Our enrichment pipeline applies
              AI-assisted tagging, generates concise summaries, and surfaces
              deadlines, eligibility, and funding amounts in seconds.
            </p>
            <p className="text-base text-slate-600">
              You can filter by location, agency, category, and keywords, then save
              the listings that matter most. Weekly refresh cycles ensure every
              opportunity stays current so your team never chases expired funding.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Who we are</h2>
            <p className="text-base text-slate-600">
              We are a civic tech team of grant writers, public policy researchers,
              and software engineers who have spent the last decade helping community
              organizations unlock public capital. We build partnerships with
              agencies and accelerators to surface emerging programs faster and to
              share feedback from the applicant community.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Why choose GrantDirectory.org</h2>
            <ul className="list-disc space-y-2 pl-6 text-base text-slate-600">
              <li>Real-time updates sourced directly from trusted government feeds.</li>
              <li>Structured data and summaries that eliminate tedious manual review.</li>
              <li>
                Collaboration tools that keep your grant pipeline organized across
                stakeholders.
              </li>
              <li>
                Expert insights and templates that improve funding outcomes for new
                and established organizations alike.
              </li>
            </ul>
            <p className="text-base text-slate-600">
              Grant funding should be accessible to every community. We are committed
              to lowering the barrier to entry for first-time applicants while
              helping experienced teams operate at scale.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
