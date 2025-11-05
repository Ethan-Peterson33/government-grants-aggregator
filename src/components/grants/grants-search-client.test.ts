import { describe, expect, it } from "vitest";
import { serializeFilters } from "@/components/grants/grants-search-client";
import type { FilterState } from "@/components/grants/filters-bar";

const filters: FilterState = {
  query: "education",
  category: "STEM",
  state: "CA",
  agency: "NIH",
  hasApplyLink: true,
};

describe("serializeFilters", () => {
  it("creates a request query string with defaults", () => {
    const params = serializeFilters(filters, 1, 12, { includeDefaults: true });
    const search = params.toString();
    expect(search).toContain("keyword=education");
    expect(search).toContain("category=STEM");
    expect(search).toContain("state=CA");
    expect(search).toContain("agency=NIH");
    expect(search).toContain("has_apply_link=1");
    expect(search).toContain("page=1");
    expect(search).toContain("pageSize=12");
  });

  it("omits default pagination values from canonical URLs", () => {
    const params = serializeFilters(filters, 1, 12);
    const search = params.toString();
    expect(search).not.toContain("page=1");
    expect(search).not.toContain("pageSize=12");
  });

  it("includes pagination overrides when necessary", () => {
    const params = serializeFilters(filters, 3, 25);
    const search = params.toString();
    expect(search).toContain("page=3");
    expect(search).toContain("pageSize=25");
  });
});
