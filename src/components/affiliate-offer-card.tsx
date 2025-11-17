"use client";

import Link from "next/link";

type AffiliateOffer = {
  title: string;
  description: string;
  href: string;
  cta: string;
  tag?: string;
  color?: string;
};

type Props = {
  category?: string;
  agency?: string;
};

// Example affiliate offers (you can expand this easily)
const offers: AffiliateOffer[] = [
{
  title: "Grant Writing Services on Fiverr",
  description:
    "Struggling with grant applications? Get expert help from professional freelance writers on Fiverr — from research and proposal drafts to compliance review and submission. Secure funding faster with proven talent.",
  href: "https://www.fiverr.com/search/gigs?query=grant%20writing&source=main_banner",
  cta: "Get started now",
  tag: "Top Pick",
  color: "blue",
}/*,
  {
    title: "Nonprofit Formation Accelerator",
    description:
      "Launch your nonprofit in weeks with attorney-reviewed templates, EIN filing guidance, and compliance tracking.",
    href: "https://partners.grantdirectory.org/nonprofit-formation-kit",
    cta: "Start Today",
    color: "green",
  },
  {
    title: "Small Business Grant Toolkit",
    description:
      "Access tailored templates and funding search tools designed for small business owners and startups.",
    href: "https://partners.grantdirectory.org/small-business-toolkit",
    cta: "Explore Toolkit",
    color: "amber",*/
  
];

function pickOffer(category?: string, agency?: string): AffiliateOffer {
  const lc = (category || "").toLowerCase();

  // SAFELY return Fiverr offer when other offers don't exist
  if (lc.includes("business")) return offers[0];
  if (lc.includes("education") || lc.includes("university")) return offers[0];
  if (lc.includes("nonprofit") || lc.includes("organization")) return offers[0];

  return offers[0]; // always fall back safely
}


export function AffiliateOfferCard({ category, agency }: Props) {
  const offer = pickOffer(category, agency);
    const color = offer?.color ?? "slate";
  return (
    <section
     className={`mt-8 rounded-lg border border-${color}-200 bg-${color}-50 p-5 shadow-sm`}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 mb-2">
        Recommended Resource
      </h2>
      <h3 className="text-lg font-semibold text-slate-900">{offer.title}</h3>
      <p className="text-sm text-slate-700 mt-1 mb-4">{offer.description}</p>
      <Link
        href={offer.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block bg-${offer.color}-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-${offer.color}-700`}
      >
        {offer.cta}
      </Link>
    </section>
  );
}
