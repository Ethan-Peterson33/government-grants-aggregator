import type { Metadata } from "next";

const pageTitle = "Terms of Use";
const pageDescription =
  "Review the guidelines for using GrantDirectory.org, our grant listings, and related affiliate resources.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: `${pageTitle} | GrantDirectory.org`,
    description: pageDescription,
  },
};

export default function TermsPage() {
  return (
    <div className="bg-white">
      <section className="container-grid py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          <header className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Terms &amp; Conditions
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {pageTitle}
            </h1>
            <p className="text-lg text-slate-600">{pageDescription}</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Acceptance of terms</h2>
            <p className="text-base text-slate-600">
              By accessing or using GrantDirectory.org, you agree to these terms
              and to comply with all applicable laws and regulations. If you do not
              agree, please discontinue use of the site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Service description</h2>
            <p className="text-base text-slate-600">
              GrantDirectory.org provides curated listings of public grants and
              related resources. We strive to ensure accuracy, but grant programs
              change frequently. Always confirm critical details with the issuing
              agency before applying.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Eligibility and use</h2>
            <p className="text-base text-slate-600">
              The directory is intended for individuals and organizations seeking
              funding opportunities in the United States. You agree not to misuse
              the service, attempt unauthorized access, or interfere with our
              infrastructure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Affiliate disclosure</h2>
            <p className="text-base text-slate-600">
              Some pages may include affiliate links to grant writing tools or
              partner services. We may earn a commission if you make a purchase or
              register through those links at no additional cost to you. Affiliate
              relationships do not influence the grants or resources we feature.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">No warranties</h2>
            <p className="text-base text-slate-600">
              GrantDirectory.org is provided on an &ldquo;as is&rdquo; basis without
              warranties of any kind. We do not guarantee funding outcomes, data
              accuracy, or uninterrupted availability. You assume any risks
              associated with your use of the site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Limitation of liability</h2>
            <p className="text-base text-slate-600">
              To the fullest extent permitted by law, GrantDirectory.org and its
              team are not liable for any direct, indirect, incidental, or
              consequential damages arising from your use of the site or reliance
              on its content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Changes to these terms</h2>
            <p className="text-base text-slate-600">
              We may update these terms as the directory evolves. Updates take
              effect when posted. Continued use after changes means you accept the
              revised terms.
            </p>
            <p className="text-sm text-slate-500">Last updated: {new Date().getFullYear()}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Contact</h2>
            <p className="text-base text-slate-600">
              For questions about these terms, email legal@grantdirectory.org or
              mail GrantDirectory.org, 123 Civic Tech Way, Washington, DC 20001.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
