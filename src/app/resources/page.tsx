// src/app/resources/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";

const pageTitle = "Resources";
const pageDescription =
  "Essential tools and services for finding, managing, and winning grants.";

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
    name: "Grant Writing Services on Fiverr",
    description:
      "Get expert help from professional freelance writers—research, proposal drafts, compliance review and submission.",
    benefit: "Secure funding faster with proven talent.",
    href:
      "https://www.fiverr.com/search/gigs?query=grant%20writing&source=main_banner",
    image: "/images/fiverr image.png",
    cta: "Get started now",
    featured: true,
  },
  // ... other placeholder resources as you had
  {
    name: "Nonprofit Formation Kit",
    description:
      "Guided setup for nonprofit registration, EIN filing, and bylaws templates.",
    benefit: "Start your nonprofit confidently and stay compliant.",
    href: "https://www.incfile.com/nonprofit",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80",
    cta: "Get Started",
  },
  {
    name: "Proposal Templates",
    description:
      "Ready-to-edit grant proposals, budgets, and logic models built by experts.",
    benefit: "Save time and submit polished applications.",
    href: "https://www.canva.com/templates/?query=grant-proposal",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
    cta: "Browse Templates",
  },
  {
    name: "Grant Readiness Checklist",
    description:
      "Quick self-assessment of your organization’s funding-preparedness.",
    benefit: "Identify your strengths before applying.",
    href: "https://grantspace.org/resources/",
    image:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
    cta: "Take Assessment",
  },
  {
    name: "Small Business Formation",
    description:
      "Simple LLC setup and compliance management for entrepreneurs.",
    benefit: "Protect your business and get funding-ready.",
    href: "https://www.shopify.com/tools/business-name-generator",
    image:
      "https://images.unsplash.com/photo-1581093588401-22d8d8c68514?auto=format&fit=crop&w=800&q=80",
    cta: "Launch Now",
  },
  {
    name: "Accounting & Bookkeeping Tools",
    description:
      "Track grant budgets and expenses easily with modern accounting apps.",
    benefit: "Stay organized and audit-ready year-round.",
    href: "https://quickbooks.intuit.com/",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
    cta: "Try QuickBooks",
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
      {/* Affiliate Disclosure */}
      <div className="container-grid py-4">
        <p className="text-sm text-slate-600">
          Disclosure: Some links on this page are affiliate links, meaning we may earn a small commission if you click through and make a purchase — at no extra cost to you. We only recommend tools we believe will genuinely help you with grant funding.
        </p>
      </div>
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
          {resources.map((resource) => (
            <article
              key={resource.name}
              className={
                resource.featured
                  ? "relative mb-8 flex flex-col gap-6 rounded-3xl border border-blue-200 bg-blue-50/60 p-8 shadow-sm md:flex-row"
                  : "mb-8 flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row"
              }
            >
              <div
                className={clsx(
                  "relative overflow-hidden rounded-2xl bg-slate-100 shadow-inner",
                  resource.featured
                    ? "h-56 w-full md:h-auto md:min-h-[220px] md:w-1/3"
                    : "h-44 w-full md:h-40 md:w-40"
                )}
              >
                <Image
                  src={resource.image}
                  alt={resource.name}
                  fill
                  sizes={resource.featured ? "(min-width: 1024px) 280px, 100vw" : "(min-width: 1024px) 160px, 50vw"}
                  priority={resource.featured}
                  className="object-cover"
                />
              </div>


              <div className="flex flex-1 flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {resource.name}
                    </h2>
                    {resource.featured ? (
                      <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600">{resource.description}</p>
                  <p className="text-sm font-medium text-slate-900">
                    Benefit:{" "}
                    <span className="font-normal text-slate-700">
                      {resource.benefit}
                    </span>
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
      </section>
    </div>
  );
}
