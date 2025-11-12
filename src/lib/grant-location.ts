import type { Grant, GrantJurisdiction } from "@/lib/types";
import { slugify, wordsFromSlug } from "@/lib/strings";
import { sentenceCase } from "@/lib/utils";

type StateInfo = {
  code: string;
  name: string;
  aliases?: string[];
};

const STATE_DATA: StateInfo[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  {
    code: "DC",
    name: "District of Columbia",
    aliases: ["Washington DC", "Washington, DC", "Washington D.C.", "D.C.", "Washington"],
  },
  { code: "PR", name: "Puerto Rico" },
  { code: "GU", name: "Guam" },
  { code: "VI", name: "U.S. Virgin Islands", aliases: ["Virgin Islands", "US Virgin Islands"] },
  { code: "AS", name: "American Samoa" },
  { code: "MP", name: "Northern Mariana Islands", aliases: ["Mariana Islands", "Commonwealth of the Northern Mariana Islands"] },
];

const stateByCode = new Map<string, StateInfo>();
const stateBySlug = new Map<string, StateInfo>();
const stateByName = new Map<string, StateInfo>();

for (const state of STATE_DATA) {
  const code = state.code.toUpperCase();
  stateByCode.set(code, state);
  stateByName.set(state.name.toLowerCase(), state);

  const nameSlug = slugify(state.name);
  if (nameSlug) stateBySlug.set(nameSlug, state);

  if (state.aliases) {
    for (const alias of state.aliases) {
      const normalized = alias.toLowerCase();
      stateByName.set(normalized, state);
      const aliasSlug = slugify(alias);
      if (aliasSlug) stateBySlug.set(aliasSlug, state);
    }
  }
}

const FEDERAL_KEYWORDS = [
  "federal",
  "nationwide",
  "national",
  "united-states",
  "us",
  "usa",
  "u-s",
  "u-s-a",
  "all-states",
  "multi-state",
  "multiple-states",
  "across-the-nation",
];

const STATEWIDE_KEYWORDS = [
  "statewide",
  "whole-state",
  "state-wide",
  "across-the-state",
  "multiple-locations",
  "multiple-counties",
  "various-locations",
  "entire-state",
  "all-counties",
  "all-regions",
  "n-a",
  "na",
];

export const FEDERAL_STATE_LABELS = [
  "Federal",
  "Nationwide",
  "National",
  "United States",
  "US",
  "USA",
  "U.S.",
  "U.S.A.",
  "All States",
  "Multi-state",
  "Multiple States",
  "Across the Nation",
];

export const STATEWIDE_CITY_LABELS = Array.from(
  new Set([
    ...STATEWIDE_KEYWORDS.map((keyword) => keyword.replace(/-/g, " ")), // raw lowercase phrases
    ...STATEWIDE_KEYWORDS.map((keyword) => wordsFromSlug(keyword)), // title-cased phrases
  ])
);

export function findStateInfo(value: string | null | undefined): StateInfo | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (stateByCode.has(upper)) return stateByCode.get(upper) ?? null;
  const lower = trimmed.toLowerCase();
  if (stateByName.has(lower)) return stateByName.get(lower) ?? null;
  const slug = slugify(trimmed);
  if (slug && stateBySlug.has(slug)) return stateBySlug.get(slug) ?? null;
  return null;
}

export function resolveStateParam(param?: string) {
  if (typeof param !== "string") {
    return { code: "", name: "Unknown" };
  }

  const cleaned = param.trim();
  if (!cleaned) return { code: "", name: "Unknown" };

  const upper = cleaned.toUpperCase();
  const info = stateByCode.get(upper);
  if (info) return { code: info.code, name: info.name };

  if (cleaned.length === 2) {
    const fallbackName = stateByCode.get(upper)?.name ?? upper;
    return { code: upper, name: fallbackName };
  }

  const normalizedName = cleaned.replace(/-/g, " ");
  const lower = normalizedName.toLowerCase();
  const foundByName = stateByName.get(lower);
  if (foundByName) return { code: foundByName.code, name: foundByName.name };

  const found = Array.from(stateByCode.values()).find((s) => s.name.toLowerCase() === lower);
  if (found) return { code: found.code, name: found.name };

  return { code: "", name: "Unknown" };
}



export function stateNameFromCode(code: string): string | null {
  const info = findStateInfo(code);
  return info?.name ?? null;
}

export function stateNameCandidatesFromCode(code: string): string[] {
  const info = findStateInfo(code);
  if (!info) return [];
  const names = new Set<string>([info.code, info.name]);
  if (info.aliases) {
    for (const alias of info.aliases) {
      names.add(alias);
    }
  }
  return Array.from(names);
}

export function isFederalStateValue(value: string | null | undefined): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalized = slugify(trimmed);
  if (!normalized) return true;
  return FEDERAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isStatewideCity(value: string | null | undefined): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalized = slugify(trimmed);
  if (!normalized) return true;
  return STATEWIDE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export type GrantLocation =
  | { jurisdiction: "federal" }
  | { jurisdiction: "state"; stateCode: string }
  | { jurisdiction: "local"; stateCode: string; citySlug: string };

export function inferGrantLocation(
  grant: { state?: string | null; city?: string | null }
): GrantLocation {
  if (isFederalStateValue(grant.state)) {
    return { jurisdiction: "federal" };
  }

  const stateInfo = findStateInfo(grant.state);
  const rawState = typeof grant.state === "string" ? grant.state.trim() : "";
  const fallbackStateCode = rawState.slice(0, 2) || "US";
  const stateCode = (stateInfo?.code ?? fallbackStateCode).toUpperCase();

  if (isStatewideCity(grant.city)) {
    return { jurisdiction: "state", stateCode };
  }

  const rawCity = typeof grant.city === "string" ? grant.city.trim() : "";
  const citySlug = rawCity ? slugify(rawCity) : "";
  if (!citySlug || STATEWIDE_KEYWORDS.some((keyword) => citySlug.includes(keyword))) {
    return { jurisdiction: "state", stateCode };
  }

  return { jurisdiction: "local", stateCode, citySlug };
}

export function matchesJurisdiction(grant: Grant, jurisdiction: GrantJurisdiction): boolean {
  return inferGrantLocation(grant).jurisdiction === jurisdiction;
}

export function cityNameFromSlug(slug: string): string {
  if (!slug) return "";
  return wordsFromSlug(slug);
}

export function normalizeStateCode(value: string | null | undefined): string | null {
  const info = findStateInfo(value ?? undefined);
  if (info) return info.code;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return null;
}
