import { describe, expect, it } from "vitest";
import type { Grant } from "@/lib/types";
import { filterGrantsLocally, grantMatchesFilters } from "@/lib/search";

const baseGrant = {
  apply_link: "https://example.com",
  category: "Education",
  funding_amount: null,
  eligibility: null,
  deadline: null,
  city: null,
  description: "",
  summary: "",
  opportunity_number: null,
  opportunity_id: null,
  agency_code: null,
  open_date: null,
  close_date: null,
} as const;

const grants: Grant[] = [
  {
    ...baseGrant,
    id: "1",
    title: "STEM Education Support",
    summary: "Funding for STEM programs",
    description: "Grants to expand science education initiatives.",
    state: "CA",
    city: "Statewide",
    agency: "National Science Foundation",
    scraped_at: "2024-03-01T00:00:00Z",
  },
  {
    ...baseGrant,
    id: "2",
    title: "Healthcare Outreach",
    summary: "Community health support",
    description: "Programs improving rural healthcare.",
    state: "TX",
    city: "Austin",
    agency: "Health and Human Services",
    scraped_at: "2024-02-15T00:00:00Z",
  },
  {
    ...baseGrant,
    id: "3",
    title: "Environmental Research Initiative",
    summary: "Climate and environment research",
    description: "Projects focused on coastal resilience.",
    state: "CA",
    city: "Los Angeles",
    agency: "Environmental Protection Agency",
    scraped_at: "2024-01-20T00:00:00Z",
    apply_link: null,
  },
  {
    ...baseGrant,
    id: "4",
    title: "Nationwide Infrastructure Partnership",
    summary: "Transportation and infrastructure improvements",
    description: "Supports national projects improving transportation systems.",
    state: null,
    city: null,
    category: "Infrastructure",
    agency: "Department of Transportation",
    scraped_at: "2023-12-31T00:00:00Z",
  },
];

describe("grantMatchesFilters", () => {
  it("matches keyword across title, summary, and description", () => {
    expect(grantMatchesFilters(grants[0], { query: "STEM" })).toBe(true);
    expect(grantMatchesFilters(grants[1], { query: "STEM" })).toBe(false);
    expect(grantMatchesFilters(grants[2], { query: "coastal" })).toBe(true);
  });

  it("enforces state and agency filters case-insensitively", () => {
    expect(grantMatchesFilters(grants[0], { state: "ca" })).toBe(true);
    expect(grantMatchesFilters(grants[0], { state: "tx" })).toBe(false);
    expect(grantMatchesFilters(grants[1], { agency: "health" })).toBe(true);
    expect(grantMatchesFilters(grants[1], { agency: "science" })).toBe(false);
  });

  it("respects jurisdiction and state code filters", () => {
    expect(grantMatchesFilters(grants[0], { stateCode: "CA", jurisdiction: "state" })).toBe(true);
    expect(grantMatchesFilters(grants[2], { jurisdiction: "local", stateCode: "CA" })).toBe(true);
    expect(grantMatchesFilters(grants[1], { jurisdiction: "local" })).toBe(true);
    expect(grantMatchesFilters(grants[3], { jurisdiction: "federal" })).toBe(true);
    expect(grantMatchesFilters(grants[3], { stateCode: "CA" })).toBe(false);
  });

  it("requires apply links when hasApplyLink is true", () => {
    expect(grantMatchesFilters(grants[2], { hasApplyLink: true })).toBe(false);
    expect(grantMatchesFilters(grants[0], { hasApplyLink: true })).toBe(true);
  });
});

describe("filterGrantsLocally", () => {
  it("filters and paginates results", () => {
    const { grants: pageOne, total, totalPages } = filterGrantsLocally(grants, { state: "CA", pageSize: 1 });
    expect(total).toBe(2);
    expect(totalPages).toBe(2);
    expect(pageOne).toHaveLength(1);
    expect(pageOne[0].id).toBe("1");

    const { grants: pageTwo } = filterGrantsLocally(grants, { state: "CA", pageSize: 1, page: 2 });
    expect(pageTwo).toHaveLength(1);
    expect(pageTwo[0].id).toBe("3");
  });

  it("returns empty data when no results match", () => {
    const { grants: matches, total } = filterGrantsLocally(grants, { query: "nonexistent" });
    expect(total).toBe(0);
    expect(matches).toHaveLength(0);
  });

  it("filters by jurisdiction for local searches", () => {
    const { grants: localGrants, total } = filterGrantsLocally(grants, {
      jurisdiction: "local",
      stateCode: "CA",
    });
    expect(total).toBe(1);
    expect(localGrants[0].id).toBe("3");
  });
});
