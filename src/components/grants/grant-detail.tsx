import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Grant } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function GrantDetail({ grant }: { grant: Grant }) {
  const locationParts = [grant.city, grant.state].filter(Boolean);
  const summary = grant.summary && grant.summary.trim() ? grant.summary.trim() : null;
  const fallbackSource = !summary && grant.description ? stripHtml(grant.description) : null;
  const fallbackSummary = fallbackSource ? fallbackSource.slice(0, 240) : null;
  const fallbackTruncated = Boolean(fallbackSource && fallbackSource.length > 240);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-3xl text-slate-900">{grant.title}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2 text-base text-slate-700">
          {grant.agency && <span className="font-medium">{grant.agency}</span>}
          {locationParts.length > 0 && (
            <>
              {grant.agency && <span aria-hidden="true">•</span>}
              <span>{locationParts.join(", ")}</span>
            </>
          )}
          {grant.category && (
            <>
              {(grant.agency || locationParts.length > 0) && <span aria-hidden="true">•</span>}
              <span>{grant.category}</span>
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
            <p className="text-slate-700">{summary ?? `${fallbackSummary}${fallbackTruncated ? "…" : ""}`}</p>
          </section>
        )}
        {grant.description && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Full description</h2>
            <div
              className="prose max-w-none prose-slate"
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
          {grant.apply_link ? (
            <Link
              href={grant.apply_link}
              target="_blank"
              rel="nofollow noopener sponsored"
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
            >
              Apply on official site
            </Link>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-6 py-3 text-sm text-slate-600 sm:w-auto">
              Application link unavailable
            </span>
          )}
          {grant.scraped_at && (
            <span className="text-sm text-slate-500">
              Updated {new Date(grant.scraped_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
