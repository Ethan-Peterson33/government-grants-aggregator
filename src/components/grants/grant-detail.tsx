import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Grant } from "@/lib/types";
import { slugify } from "@/lib/strings";

function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeExternalUrl(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    // If it's already absolute and valid, keep it
    const u = new URL(trimmed);
    return u.href;
  } catch {
    // Try to force https:// if someone saved a bare domain or //host path
    const guess = trimmed.startsWith("//") ? `https:${trimmed}` : `https://${trimmed}`;
    try {
      const u2 = new URL(guess);
      return u2.href;
    } catch {
      return null;
    }
  }
}

export function GrantDetail({ grant }: { grant: Grant }) {
  const locationParts = [grant.city, grant.state].filter(Boolean);
  const summary = grant.summary && grant.summary.trim() ? grant.summary.trim() : null;
  const agencyName = grant.agency_name ?? grant.agency ?? null;
  const agencySlug = grant.agency_slug ?? (agencyName ? slugify(agencyName) : "");
  const categoryLabel = grant.category ?? grant.category_code ?? null;
  const categorySlug = categoryLabel ? slugify(categoryLabel) : "";

  const fallbackSource = !summary && grant.description ? stripHtml(grant.description) : null;
  const fallbackSummary = fallbackSource ? fallbackSource.slice(0, 240) : null;
  const fallbackTruncated = Boolean(fallbackSource && fallbackSource.length > 240);

  const applyHref = normalizeExternalUrl(grant.apply_link);

  // Render
  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-3xl text-slate-900">{grant.title}</CardTitle>

        <CardDescription className="flex flex-wrap items-center gap-2 text-base text-slate-700">
          {agencyName && agencySlug ? (
            <Link href={`/agencies/${agencySlug}`} className="font-medium text-blue-700 hover:text-blue-900">
              {agencyName}
            </Link>
          ) : (
            agencyName && <span className="font-medium">{agencyName}</span>
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
                  className="text-blue-700 hover:text-blue-900"
                >
                  {categoryLabel}
                </Link>
              ) : (
                <span>{categoryLabel}</span>
              )}
            </>
          )}
        </CardDescription>

        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {grant.funding_amount && <span>Funding: {grant.funding_amount}</span>}
          {grant.deadline && <span>Deadline: {grant.deadline}</span>}
          {grant.open_date && <span>Opens: {grant.open_date}</span>}
          {grant.opportunity_number && <span>Opportunity #{grant.opportunity_number}</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {(summary || fallbackSummary) && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
            <p className="text-slate-700">
              {summary ?? `${fallbackSummary}${fallbackTruncated ? "…" : ""}`}
            </p>
          </section>
        )}

        {grant.description && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Full description</h2>
            <div
              className="prose max-w-none prose-slate"
              // NOTE: description is HTML from trusted sources; sanitize upstream if needed.
              dangerouslySetInnerHTML={{ __html: grant.description }}
            />
          </section>
        )}

        {grant.eligibility && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Eligibility</h2>
            <p className="text-slate-700">{grant.eligibility}</p>
          </section>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {applyHref ? (
            // ✅ Use a plain <a> for external URLs to avoid Next prefetch/pushState and accidental 404s.
            <a
              href={applyHref}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
            >
              Apply on official site
            </a>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-6 py-3 text-sm text-slate-600 sm:w-auto">
              Application link unavailable
            </span>
          )}

          {grant.scraped_at && (
            <span className="text-sm text-slate-500">
              Updated{" "}
              {(() => {
                const d = new Date(grant.scraped_at);
                return isNaN(d.getTime()) ? "recently" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
              })()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
