import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deriveAgencySlug, grantPath } from "@/lib/slug";
import { slugify } from "@/lib/strings";
import type { Grant } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getSummary(grant: Grant): string | null {
  if (grant.summary && grant.summary.trim()) {
    return grant.summary.trim();
  }
  if (grant.description) {
    const plain = stripHtml(grant.description);
    return plain ? `${plain.slice(0, 220)}${plain.length > 220 ? "…" : ""}` : null;
  }
  return null;
}

export function GrantCard({ grant }: { grant: Grant }) {
  const href = grantPath(grant);
  const locationParts = [grant.city, grant.state].filter(Boolean);
  const summary = getSummary(grant);
  const agencyName = grant.agency_name ?? grant.agency ?? null;
  const agencySlug =
    grant.agency_slug ??
    deriveAgencySlug({ agency_code: grant.agency_code, agency_name: agencyName ?? null });
  const categoryLabel = grant.category ?? grant.category_code ?? null;
  const categorySlug = categoryLabel ? slugify(categoryLabel) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <Link href={href} className="text-slate-900 hover:text-blue-700">
            {grant.title}
          </Link>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {agencyName && agencySlug ? (
            <Link
              href={`/agencies/${agencySlug}`}
              className="font-medium text-slate-700 hover:text-blue-700"
            >
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
                <Link
                  href={`/grants/category/${categorySlug}`}
                  className="hover:text-blue-700"
                >
                  {categoryLabel}
                </Link>
              ) : (
                <span>{categoryLabel}</span>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        {summary && <p>{summary}</p>}
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-wide text-slate-500">
          {grant.funding_amount && (
            <span className="font-semibold text-slate-700 normal-case">
              Funding: <span className="font-medium">{grant.funding_amount}</span>
            </span>
          )}
          {grant.deadline && (
            <span className="font-semibold text-slate-700 normal-case">
              Deadline: <span className="font-medium">{grant.deadline}</span>
            </span>
          )}
          {grant.open_date && (
            <span className="font-semibold text-slate-700 normal-case">
              Opens: <span className="font-medium">{grant.open_date}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
