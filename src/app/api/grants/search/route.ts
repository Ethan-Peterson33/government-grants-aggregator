import { NextResponse } from "next/server";
import { searchGrants } from "@/lib/search";
import type { GrantFilters } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 12;

const parseNumber = (value: string | null, fallback: number, { min = 1, max = Number.POSITIVE_INFINITY } = {}) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const keyword = searchParams.get("keyword") ?? searchParams.get("query") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const state = searchParams.get("state") ?? undefined;
  const stateCode = searchParams.get("stateCode") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const agency = searchParams.get("agency") ?? undefined;
  const agencySlug = searchParams.get("agency_slug") ?? undefined;
  const agencyCode = searchParams.get("agency_code") ?? undefined;
  const jurisdictionParam = searchParams.get("jurisdiction");
  const jurisdiction =
    jurisdictionParam === "federal" ||
    jurisdictionParam === "state" ||
    jurisdictionParam === "local" ||
    jurisdictionParam === "private"
      ? jurisdictionParam
      : undefined;
  const hasApplyLink = searchParams.get("has_apply_link") === "1";

  const applicantTypesParam = searchParams.get("applicant_types");
  const applicantTypes = applicantTypesParam
    ? applicantTypesParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined;
  const geographyScope = searchParams.get("geography_scope") ?? undefined;

  const page = parseNumber(searchParams.get("page"), 1, { min: 1 });
  const pageSize = parseNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, { min: 1, max: 50 });

  const filters: GrantFilters = {
    query: keyword,
    category: category ?? undefined,
    state: state ?? undefined,
    stateCode: stateCode ?? undefined,
    city: city ?? undefined,
    agency: agency ?? undefined,
    agencySlug: agencySlug ?? undefined,
    agencyCode: agencyCode ?? undefined,
    jurisdiction,
    hasApplyLink,
    applicantTypes,
    geographyScope,
    page,
    pageSize,
  };

  try {
    const result = await searchGrants(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("API search error", error);
    return NextResponse.json({
      grants: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      error: "Unable to fetch grants",
    }, { status: 500 });
  }
}
