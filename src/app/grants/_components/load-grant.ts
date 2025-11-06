import type { Grant } from "@/lib/types";
import { getGrantById, getGrantByShortId } from "@/lib/search";

type SearchParamSource =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | { get: (key: string) => string | null; getAll?: (key: string) => string[] | undefined };

type SearchParamInput = SearchParamSource | Promise<SearchParamSource | undefined>;

function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return Boolean(value) && typeof (value as Promise<unknown>).then === "function";
}

function snapshotSearchParams(
  source: SearchParamSource | undefined
): Record<string, string | string[] | undefined> | string | null {
  if (!source) return null;

  if (source instanceof URLSearchParams || typeof (source as URLSearchParams).entries === "function") {
    const entries = Array.from((source as URLSearchParams).entries());
    return entries.reduce<Record<string, string | string[] | undefined>>((acc, [key, value]) => {
      const existing = acc[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else if (typeof existing === "string") {
        acc[key] = [existing, value];
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  if (typeof source === "object" && source !== null && !("get" in source)) {
    return Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, Array.isArray(value) ? value : value])
    );
  }

  if (typeof (source as { get?: unknown }).get === "function") {
    return "[Function-based search params—unable to enumerate keys]";
  }

  return String(source);
}

async function normalizeSearchParams(
  searchParams: SearchParamInput | undefined
): Promise<{
  params: SearchParamSource | undefined;
  wasPromise: boolean;
  resolutionError: unknown;
}> {
  if (!searchParams) {
    return { params: undefined, wasPromise: false, resolutionError: null };
  }

  if (!isPromise(searchParams)) {
    return { params: searchParams, wasPromise: false, resolutionError: null };
  }

  try {
    const resolved = await searchParams;
    return { params: resolved ?? undefined, wasPromise: true, resolutionError: null };
  } catch (error) {
    console.error("🧭 Failed to resolve searchParams promise", error);
    return { params: undefined, wasPromise: true, resolutionError: error };
  }
}

function extractShortIdFromSlug(slug: string | undefined | null): string | null {
  if (!slug || typeof slug !== "string") return null;
  const last = slug.split("-").at(-1);
  return last ? last.toLowerCase() : null;
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function resolveParam(searchParams: SearchParamSource | undefined, key: string): string | undefined {
  if (!searchParams) return undefined;

  if (typeof (searchParams as URLSearchParams).get === "function") {
    const params = searchParams as URLSearchParams;
    const values = typeof params.getAll === "function" ? params.getAll(key) : [];
    const first = values && values.length > 0 ? values[0] : params.get(key);
    return typeof first === "string" ? first : undefined;
  }

  const raw = (searchParams as Record<string, string | string[] | undefined>)[key];
  return getSingleParam(raw);
}

export async function loadGrant(
  slug: string | undefined,
  searchParams?: SearchParamInput
): Promise<Grant | null> {
  const { params: resolvedParams, wasPromise, resolutionError } = await normalizeSearchParams(searchParams);
  const idParam = resolveParam(resolvedParams, "id");
  const grantId = typeof idParam === "string" ? decodeURIComponent(idParam) : undefined;
  const short = extractShortIdFromSlug(slug);

  console.log("🧭 loadGrant params", {
    slug,
    idParam,
    decodedGrantId: grantId,
    shortIdFromSlug: short,
    searchParamsType: resolvedParams ? resolvedParams.constructor?.name ?? typeof resolvedParams : null,
    searchParamsWasPromise: wasPromise,
    searchParamsResolutionError: resolutionError ? String(resolutionError) : null,
    searchParamsSnapshot: snapshotSearchParams(resolvedParams),
  });

  if (grantId) {
    console.log("🔐 Attempting getGrantById", { id: grantId });
    return getGrantById(grantId);
  }

  if (short) {
    return getGrantByShortId(short);
  }

  return null;
}
