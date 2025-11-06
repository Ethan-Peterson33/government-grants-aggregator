import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";

const pageTitle = "Resources";
const pageDescription =
  "Curated tools, templates, and services that help grant professionals plan, write, and submit winning proposals.";

type Resource = {
  name: string;
  description: string;
  benefit: string;
  href: string;
  image: string;
  cta: string;
  featured?: boolean;
};

const resources: Resource[] = [
  {
    name: "Grant Writing Software Suite",
    description:
      "Collaborative workspace with AI-assisted drafting, compliance checklists, and deadline reminders for every application stage.",
    benefit: "Cut drafting time in half with guided outlines and auto-filled boilerplate language.",
    href: "https://partners.grantdirectory.org/grant-writing-suite",
    image:
      "https://images.unsplash.com/photo-1523285367489-d38aec03b7f3?auto=format&fit=crop&w=800&q=80",
    cta: "Learn More",
    featured: true,
  },
  {
    name: "Nonprofit Formation Accelerator",
    description:
      "Step-by-step incorporation toolkit including bylaws templates, EIN filing support, and compliance reminders.",
    benefit: "Launch your nonprofit in weeks with attorney-reviewed templates and filing guidance.",
    href: "https://partners.grantdirectory.org/nonprofit-formation-kit",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80",
    cta: "Learn More",
  },
  {
    name: "Grant Proposal Template Bundle",
    description:
      "Editable proposal narratives, budget spreadsheets, and logic model frameworks crafted by veteran grant writers.",
    benefit: "Deliver polished submissions faster with plug-and-play templates for every funding stream.",
    href: "https://partners.grantdirectory.org/proposal-template-bundle",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
    cta: "Learn More",
  },
  {
    name: "Grant Readiness Assessment",
    description:
      "Interactive diagnostic that scores your organization across governance, finance, and impact storytelling.",
    benefit: "Reveal strengths and blind spots before you apply so you can improve competitiveness.",
    href: "https://partners.grantdirectory.org/grant-readiness-assessment",
    image:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
    cta: "Learn More",
  },
];

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: `${pageTitle} | GrantDirectory.org`,
    description: pageDescription,
  },
};

const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: resources.map((resource, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Product",
      name: resource.name,
      description: resource.description,
      image: resource.image,
      offers: {
        "@type": "Offer",
        url: resource.href,
        availability: "https://schema.org/InStock",
      },
    },
  })),
};

export default function ResourcesPage() {
  return (
    <div className="bg-white">
      <Script
        id="resources-item-list"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <section className="container-grid py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
          <ol className="flex items-center space-x-2">
            <li>
              <Link className="text-blue-600 hover:text-blue-700" href="/">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">
              /
            </li>
            <li className="font-medium text-slate-700">Resources</li>
          </ol>
        </nav>

        <header className="mb-12 max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Toolkit
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tools that accelerate your next grant win
          </h1>
          <p className="text-lg text-slate-600">{pageDescription}</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-3">
            {resources.map((resource) => (
              <article
                key={resource.name}
                className={
                  resource.featured
                    ? "relative mb-8 flex flex-col gap-6 rounded-3xl border border-blue-200 bg-blue-50/60 p-8 shadow-sm md:flex-row"
                    : "mb-8 flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row"
                }
              >
                <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-100 md:h-44 md:w-56">
                  <Image
                    src={resource.image}
                    alt={resource.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 220px"
                    priority={resource.featured}
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-slate-900">{resource.name}</h2>
                      {resource.featured ? (
                        <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Featured Offer
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-600">{resource.description}</p>
                    <p className="text-sm font-medium text-slate-900">
                      Main benefit: <span className="font-normal text-slate-700">{resource.benefit}</span>
                    </p>
                  </div>
                  <div>
                    <a
                      href={resource.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      {resource.cta}
                      <span className="sr-only"> about {resource.name}</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
