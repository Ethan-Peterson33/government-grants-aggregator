"use client";

import Link from "next/link";

export type AffiliateOffer = {
  title: string;
  description: string;
  href: string;
  cta: string;
  tag?: string;
  color?: "blue" | "green" | "amber" | "slate";
  external?: boolean;
  secondaryHref?: string;
  secondaryCta?: string;
  secondaryExternal?: boolean;
  tags?: string[];
};

type Props = {
  category?: string;
  agency?: string;
  offer?: AffiliateOffer;
};

const offers: AffiliateOffer[] = [
  {
    title: "Grant Writing Services on Fiverr",
    description:
      "Struggling with grant applications? Get expert help from professional freelance writers on Fiverr — from research and proposal drafts to compliance review and submission. Secure funding faster with proven talent.",
    href: "https://www.fiverr.com/search/gigs?query=grant%20writing&source=main_banner",
    cta: "Get started now",
    tag: "Top Pick",
    color: "blue",
    external: true,
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
    color: "amber",
  },*/
];

function pickOffer(category?: string, agency?: string): AffiliateOffer {
  const lc = (category || "").toLowerCase();

  if (lc.includes("business")) return offers[0];
  if (lc.includes("education") || lc.includes("university")) return offers[0];
  if (lc.includes("nonprofit") || lc.includes("organization")) return offers[0];

  return offers[0];
}

export function AffiliateOfferCard({ category, agency: _agency, offer }: Props) {
  const resolvedOffer = offer ?? pickOffer(category, _agency);

  const palette = {
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    green: {
      border: "border-green-200",
      bg: "bg-green-50",
      button: "bg-green-600 hover:bg-green-700",
    },
    amber: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      button: "bg-amber-600 hover:bg-amber-700",
    },
    slate: {
      border: "border-slate-200",
      bg: "bg-slate-50",
      button: "bg-slate-600 hover:bg-slate-700",
    },
  } as const;

  const colorKey = resolvedOffer?.color ?? "slate";
  const colors = palette[colorKey] ?? palette.slate;
  const isPrimaryExternal = resolvedOffer.external ?? resolvedOffer.href.startsWith("http");
  const isSecondaryExternal = resolvedOffer.secondaryExternal ??
    (resolvedOffer.secondaryHref ? resolvedOffer.secondaryHref.startsWith("http") : false);

  return (
    <section
      className={`mt-8 rounded-lg border ${colors.border} ${colors.bg} p-5 shadow-sm`}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 mb-2">
        Recommended Resource
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {resolvedOffer.title}
            </h3>
            {resolvedOffer.tag ? (
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {resolvedOffer.tag}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-700">{resolvedOffer.description}</p>
          {resolvedOffer.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {resolvedOffer.tags.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={resolvedOffer.href}
          target={isPrimaryExternal ? "_blank" : undefined}
          rel={isPrimaryExternal ? "noopener noreferrer" : undefined}
          className={`inline-flex items-center justify-center ${colors.button} text-white text-sm font-medium px-4 py-2 rounded-md`}
        >
          {resolvedOffer.cta}
        </Link>
        {resolvedOffer.secondaryHref && resolvedOffer.secondaryCta ? (
          <Link
            href={resolvedOffer.secondaryHref}
            target={isSecondaryExternal ? "_blank" : undefined}
            rel={isSecondaryExternal ? "noopener noreferrer" : undefined}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {resolvedOffer.secondaryCta}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
