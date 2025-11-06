import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Breadcrumb } from "@/components/grants/breadcrumb";
import { GrantCard } from "@/components/grants/grant-card";
import { Pagination } from "@/components/grants/pagination";
import { prisma } from "@/lib/prisma";
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from "@/lib/seo";
import { safeNumber } from "@/lib/search";
import { slugify } from "@/lib/strings";
import type { Grant } from "@/lib/types";

type PrismaGrantWithAgency = Prisma.GrantGetPayload<{ include: { agency: true } }>;

function serializeGrant(grant: PrismaGrantWithAgency) {
  if (!grant) return null;
  const agencyName = grant.agencyName ?? grant.legacyAgency ?? null;
  const fallbackSlug = agencyName ? slugify(agencyName) : "";
  const agencySlug = grant.agency?.slug ?? (fallbackSlug ? fallbackSlug : null);
  return {
    id: grant.id,
    title: grant.title,
    apply_link: grant.applyLink ?? null,
    category: grant.category ?? grant.categoryCode ?? null,
    category_code: grant.categoryCode ?? null,
    agency: agencyName,
    agency_name: agencyName,
    agency_slug: agencySlug,
    agency_code: grant.agencyCode ?? null,
    funding_amount: grant.fundingAmount ?? null,
    eligibility: grant.eligibility ?? null,
    deadline: grant.deadline ?? null,
    state: grant.state ?? null,
    city: grant.city ?? null,
    summary: grant.summary ?? null,
    description: grant.description ?? null,
    scraped_at: grant.scrapedAt ? grant.scrapedAt.toISOString() : null,
    opportunity_number: grant.opportunityNumber ?? null,
    opportunity_id: grant.opportunityId ?? null,
    open_date: grant.openDate ?? null,
    close_date: grant.closeDate ?? null,
  } satisfies Grant;
}

async function loadAgency(slug: string) {
  const agency = await prisma.agency.findUnique({ where: { slug } });
  if (!agency) return null;
  return agency;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const agency = await loadAgency(params.slug);
  if (!agency) {
    return { title: "Agency Not Found" };
  }
  return {
    title: `${agency.agency_name} Grants`,
    description: agency.description ?? `Explore grants from ${agency.agency_name}.`,
  };
}

export default async function AgencyPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = safeNumber(searchParams?.page, 1);
  const pageSize = Math.min(50, safeNumber(searchParams?.pageSize, 12));

  const agency = await loadAgency(params.slug);
  if (!agency) {
    notFound();
  }

  const [total, prismaGrants] = await Promise.all([
    prisma.grant.count({ where: { agencyId: agency.id } }),
    prisma.grant.findMany({
      where: { agencyId: agency.id },
      orderBy: { title: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { agency: true },
    }),
  ]);

  const grants = prismaGrants.map((grant) => serializeGrant(grant) as Grant);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Grants", href: "/grants" },
    { label: agency.agency_name, href: `/agencies/${agency.slug}` },
  ];

  const itemListJsonLd = generateItemListJsonLd(grants);

  const getHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set("page", String(targetPage));
    if (pageSize !== 12) params.set("pageSize", String(pageSize));
    const query = params.toString();
    return query ? `/agencies/${agency.slug}?${query}` : `/agencies/${agency.slug}`;
  };

  return (
    <div className="container-grid space-y-6 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{agency.agency_name}</h1>
        {agency.description && <p className="text-slate-700">{agency.description}</p>}
        {agency.website && (
          <p className="text-sm">
            Website:{" "}
            <a
              className="text-blue-600 underline"
              href={agency.website}
              target="_blank"
              rel="noreferrer"
            >
              {agency.website}
            </a>
          </p>
        )}
      </header>

      <section className="space-y-4">
        <div className="space-y-4">
          {grants.length ? (
            grants.map((grant) => <GrantCard key={grant.id} grant={grant} />)
          ) : (
            <div className="rounded-md border border-slate-200 p-8 text-center text-slate-600">
              No grants published yet for this agency.
            </div>
          )}
        </div>
        {grants.length > 0 && (
          <Pagination total={total} pageSize={pageSize} currentPage={page} getHref={getHref} />
        )}
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateBreadcrumbJsonLd(
              breadcrumbItems.map((item) => ({ name: item.label, url: item.href })),
            ),
            itemListJsonLd,
          ]),
        }}
      />
    </div>
  );
}
