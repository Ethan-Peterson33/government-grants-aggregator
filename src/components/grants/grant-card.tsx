import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deriveAgencySlug, grantPath } from "@/lib/slug";
import { slugify } from "@/lib/strings";
import type { Grant } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatUpdatedDate(grant: Grant): string | null {
  const raw =
    grant.last_updated_at ??
    grant.verified_at ??
    grant.scraped_at ??
    null;

  if (!raw) return null;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


function getSummary(grant: Grant): string | null {
  if (grant.summary?.trim()) return grant.summary.trim();
  if (grant.description) {
    const plain = stripHtml(grant.description);
    return plain ? `${plain.slice(0, 220)}${plain.length > 220 ? "…" : ""}` : null;
  }
  return null;
}

function getEligibilitySnippet(grant: Grant): string | null {
  if (!grant.eligibility) return null;
  const plain = stripHtml(grant.eligibility);
  return plain ? `${plain.slice(0, 140)}${plain.length > 140 ? "…" : ""}` : null;
}

function inferStatus(grant: Grant): { label: string; tone: "green" | "yellow" | "slate" } {
  const now = new Date();

  const deadline = grant.deadline ? new Date(grant.deadline) : null;
  const openDate = grant.open_date ? new Date(grant.open_date) : null;

  if (deadline && !isNaN(deadline.getTime()) && deadline < now) {
    return { label: "Closed", tone: "slate" };
  }
  if (openDate && !isNaN(openDate.getTime()) && openDate > now) {
    return { label: "Upcoming", tone: "yellow" };
  }
  if (!deadline && !openDate) {
    return { label: "Rolling", tone: "green" };
  }
  return { label: "Open", tone: "green" };
}

export function GrantCard({ grant }: { grant: Grant }) {
  const href = grantPath(grant);
  const locationParts = [grant.city, grant.state].filter(Boolean);
  const summary = getSummary(grant);
  const eligibilitySnippet = getEligibilitySnippet(grant);
  const updatedText = formatUpdatedDate(grant);
  const agencyName = grant.agency_name ?? grant.agency ?? null;
  const agencySlug =
    grant.agency_slug ??
    deriveAgencySlug({ agency_code: grant.agency_code, agency_name: agencyName ?? null });

  const categoryLabel = grant.category ?? grant.category_code ?? null;
  const categorySlug = categoryLabel ? slugify(categoryLabel) : "";

  // ✅ NEW amount display logic
  const amountText =
    grant.award_amount_text?.trim() ||
    (grant.award_amount_max != null
      ? grant.award_amount_min != null
        ? `$${grant.award_amount_min.toLocaleString()}–$${grant.award_amount_max.toLocaleString()}`
        : `Up to $${grant.award_amount_max.toLocaleString()}`
      : grant.funding_amount ?? grant.amount ?? null);

  // ✅ prefer enriched status_label if present
  const status = grant.status_label
    ? { label: grant.status_label, tone: grant.status_label.toLowerCase() === "closed" ? "slate" : "green" }
    : inferStatus(grant);

  const statusClass =
    status.tone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status.tone === "yellow"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <Card className="transition hover:shadow-md">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl leading-snug">
            <Link href={href} className="text-slate-900 hover:text-blue-700">
              {grant.title}
            </Link>
          </CardTitle>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
          >
            {status.label}
          </span>
        </div>

        <CardDescription className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {agencyName && agencySlug ? (
            <Link href={`/agencies/${agencySlug}`} className="font-medium text-slate-700 hover:text-blue-700">
              {agencyName}
            </Link>
          ) : (
            agencyName && <span className="font-medium text-slate-700">{agencyName}</span>
          )}

          {locationParts.length > 0 && (
            <>
              {agencyName && <span aria-hidden="true">•</span>}
              <span>{locationParts.join(", ")}</span>
            </>
          )}

          {categoryLabel && (
            <>
              {(agencyName || locationParts.length > 0) && <span aria-hidden="true">•</span>}
              {categorySlug ? (
                <Link href={`/grants/category/${categorySlug}`} className="hover:text-blue-700">
                  {categoryLabel}
                </Link>
              ) : (
                <span>{categoryLabel}</span>
              )}
            </>
          )}

          {grant.type && (
            <>
              <span aria-hidden="true">•</span>
              <span className="capitalize">{grant.type}</span>
            </>
          )}
        </CardDescription>
              {updatedText && (
        <p className="text-xs text-slate-500">
          Updated: {updatedText}
        </p>
)}

      </CardHeader>

      <CardContent className="space-y-3 text-sm text-slate-700">
        {summary && <p>{summary}</p>}

        {eligibilitySnippet && (
          <p className="text-slate-600">
            <span className="font-semibold text-slate-700">Eligible for:</span>{" "}
            {eligibilitySnippet}
          </p>
        )}

        {/* ✅ break long text so it doesn't overflow */}
        <div className="flex flex-wrap gap-2 pt-1">
          {amountText && (
            <Badge variant="secondary" className="text-xs normal-case whitespace-normal break-words">
              Funding: {amountText}
            </Badge>
          )}

          {grant.deadline && (
            <Badge variant="secondary" className="text-xs normal-case whitespace-normal">
              Deadline: {grant.deadline}
            </Badge>
          )}

          {grant.deadline_type && (
            <Badge variant="outline" className="text-xs normal-case">
              {grant.deadline_type}
            </Badge>
          )}

          {grant.funding_mechanism && (
            <Badge variant="outline" className="text-xs normal-case">
              {grant.funding_mechanism}
            </Badge>
          )}

          {grant.jurisdiction && (
            <Badge variant="outline" className="text-xs normal-case">
              {grant.jurisdiction}
            </Badge>
          )}
        </div>

        <div className="pt-2">
          <Link href={href} className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800">
            View details →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
