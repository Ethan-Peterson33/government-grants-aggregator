import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { Grant } from "@/lib/types";
import { deriveAgencySlug } from "@/lib/slug";
import { slugify } from "@/lib/strings";

function stripHtml(html?: string | null) {
  return html ? html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function normalizeExternalUrl(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    try {
      return new URL(`https://${trimmed}`).href;
    } catch {
      return null;
    }
  }
}

function formatDate(raw?: string | null) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function formatUpdated(grant: Grant) {
  return (
    formatDate(grant.last_updated_at) ||
    formatDate(grant.verified_at) ||
    formatDate(grant.last_verified_at) ||
    formatDate(grant.scraped_at)
  );
}

function formatAward(grant: Grant): string | null {
  const min = grant.award_amount_min ?? null;
  const max = grant.award_amount_max ?? null;

  if (max != null) {
    if (min != null) return `$${min.toLocaleString()}–$${max.toLocaleString()}`;
    return `Up to $${max.toLocaleString()}`;
  }
  return grant.award_amount_text ?? null;
}

function getStatus(grant: Grant) {
  if (grant.status_label) {
    const s = grant.status_label.toLowerCase();
    if (s.includes("closed")) return { label: grant.status_label, tone: "slate" };
    if (s.includes("upcoming")) return { label: grant.status_label, tone: "yellow" };
    if (s.includes("rolling")) return { label: grant.status_label, tone: "green" };
    return { label: grant.status_label, tone: "green" };
  }

  const now = new Date();
  const deadline = grant.deadline ? new Date(grant.deadline) : null;
  const openDate = grant.open_date ? new Date(grant.open_date) : null;

  if (deadline && deadline < now) return { label: "Closed", tone: "slate" };
  if (openDate && openDate > now) return { label: "Upcoming", tone: "yellow" };
  if (!deadline && !openDate) return { label: "Rolling", tone: "green" };
  return { label: "Open", tone: "green" };
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

export function GrantDetail({ grant }: { grant: Grant }) {
  const summary = grant.summary?.trim() || stripHtml(grant.description)?.slice(0, 240);

  const agencyName = grant.agency_name ?? grant.agency ?? null;
  const agencySlug =
    grant.agency_slug ??
    deriveAgencySlug({
      agency_code: grant.agency_code,
      agency_name: agencyName ?? null,
    });

  const categoryLabel = grant.category ?? grant.category_code ?? null;
  const categorySlug = categoryLabel ? slugify(categoryLabel) : "";

  const applyHref = normalizeExternalUrl(grant.apply_link);
  const officialHref = normalizeExternalUrl(
    grant.official_source_url ??  null
  );

  const updatedText = formatUpdated(grant);
  const awardText = formatAward(grant);

  const status = getStatus(grant);

  const statusClass =
    status.tone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status.tone === "yellow"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  const location = [grant.city, grant.state].filter(Boolean).join(", ");

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-3xl text-slate-900">{grant.title}</CardTitle>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
          >
            {status.label}
          </span>
        </div>

        <CardDescription className="flex flex-wrap items-center gap-2 text-base text-slate-700">
          {agencySlug && agencyName ? (
            <Link href={`/agencies/${agencySlug}`} className="font-medium text-blue-700 hover:text-blue-900">
              {agencyName}
            </Link>
          ) : (
            agencyName
          )}

          {location && (
            <>
              <span aria-hidden="true">•</span>
              <span>{location}</span>
            </>
          )}

          {categorySlug && (
            <>
              <span aria-hidden="true">•</span>
              <Link
                href={`/grants/category/${categorySlug}`}
                className="text-blue-700 hover:text-blue-900"
              >
                {categoryLabel}
              </Link>
            </>
          )}
        </CardDescription>

        {/* Key Info Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {awardText && <Chip>Funding: {awardText}</Chip>}
          {grant.funding_mechanism && <Chip>{grant.funding_mechanism}</Chip>}
          {grant.deadline_type && <Chip>{grant.deadline_type}</Chip>}
          {grant.open_date && <Chip>Opens: {formatDate(grant.open_date)}</Chip>}
          {grant.deadline && <Chip>Deadline: {formatDate(grant.deadline)}</Chip>}
          {grant.geography_scope && <Chip>Scope: {grant.geography_scope}</Chip>}
          {grant.type && <Chip>{grant.type}</Chip>}
        </div>

        {updatedText && (
          <p className="text-xs text-slate-500">Updated: {updatedText}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-8 text-slate-700">
        {/* Summary */}
        {summary && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
            <p>{summary}</p>
          </section>
        )}

        {/* Benefits */}
        {grant.benefit_tags?.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Benefits</h2>
            <div className="flex flex-wrap gap-2">
              {grant.benefit_tags.map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          </section>
        ) : null}

        {/* Applicant Types */}
        {grant.applicant_types?.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Who Can Apply</h2>
            <div className="flex flex-wrap gap-2">
              {grant.applicant_types.map((a) => (
                <Chip key={a}>{a}</Chip>
              ))}
            </div>
          </section>
        ) : null}

        {/* Eligible Geography */}
        {grant.eligible_geographies_text && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Eligible Locations</h2>
            <p>{grant.eligible_geographies_text}</p>
          </section>
        )}

        {/* Eligibility */}
        {grant.eligibility && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Eligibility</h2>
            <p className="whitespace-pre-wrap">{grant.eligibility}</p>
          </section>
        )}

        {/* Description */}
        {grant.description && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Full Description</h2>
            <div
              className="prose max-w-none prose-slate"
              dangerouslySetInnerHTML={{ __html: grant.description }}
            />
          </section>
        )}

        {/* Verification Box */}
        {(grant.complexity_label ||
          grant.confidence_score ||
          grant.confidence_notes ||
          officialHref ||
          grant.source_domain) && (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Verification & Details
            </h2>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {grant.complexity_label && (
                <div>
                  <span className="font-semibold">Complexity:</span>{" "}
                  {grant.complexity_label}
                </div>
              )}

              {grant.confidence_score != null && (
                <div>
                  <span className="font-semibold">Confidence:</span>{" "}
                  {Math.round(grant.confidence_score * 100)}%
                </div>
              )}

              {grant.status_label && (
                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  {grant.status_label}
                </div>
              )}

              {grant.source_domain && (
                <div>
                  <span className="font-semibold">Source:</span>{" "}
                  {grant.source_domain}
                </div>
              )}
            </div>

            {grant.confidence_notes && (
              <p className="text-sm text-slate-600">{grant.confidence_notes}</p>
            )}

            {officialHref && (
              <a
                href={officialHref}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Official source → {grant.source_domain ?? ""}
              </a>
            )}
          </section>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {applyHref ? (
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

          {updatedText && (
            <span className="text-sm text-slate-500">Updated {updatedText}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
