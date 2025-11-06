import type { Grant } from "@/lib/types";
import { getGrantById, getGrantByShortId } from "@/lib/search";

type SearchParamSource =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | { get: (key: string) => string | null; getAll?: (key: string) => string[] | undefined };

type SearchParamInput =
  | SearchParamSource
  | undefined
  | Promise<SearchParamSource | undefined>
  | Promise<SearchParamSource | Promise<SearchParamSource | undefined>>;

function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return Boolean(value) && typeof (value as Promise<unknown>).then === "function";
}

type SearchParamSnapshot =
  | Record<string, string | string[] | undefined>
  | string
  | null;

function snapshotSearchParams(source: SearchParamSource | undefined): SearchParamSnapshot {
  if (!source) return null;

  if (isPromise(source)) {
    return "[Promise]";
  }

  const entriesFn = (source as URLSearchParams).entries;
  if (source instanceof URLSearchParams || typeof entriesFn === "function") {
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

type NormalizedSearchParams = {
  params: SearchParamSource | undefined;
  promiseDepth: number;
  resolutionError: unknown;
  snapshots: SearchParamSnapshot[];
  lastResolvedType: string | null;
};

function summarizeSearchParamInput(input: SearchParamInput) {
  const isInputPromise = isPromise(input);
  const constructorName = input && typeof input === "object" ? input.constructor?.name ?? null : null;
  const hasGet = Boolean(input && typeof (input as { get?: unknown }).get === "function");
  const keys =
    input && typeof input === "object" && !isInputPromise && !hasGet
      ? Object.keys(input as Record<string, unknown>)
      : null;

  return {
    isPromise: isInputPromise,
    constructorName,
    typeOf: typeof input,
    hasGet,
    keys,
  };
}

async function normalizeSearchParams(searchParams: SearchParamInput): Promise<NormalizedSearchParams> {
  const snapshots: SearchParamSnapshot[] = [];
  let paramsOrPromise: SearchParamInput = searchParams;
  let depth = 0;
  let resolutionError: unknown = null;

  while (paramsOrPromise && isPromise(paramsOrPromise)) {
    depth += 1;
    console.log("🧭 Resolving searchParams promise layer", { depth });
    try {
      paramsOrPromise = await paramsOrPromise;
      console.log("🧭 Resolved searchParams layer", {
        depth,
        resolvedType:
          paramsOrPromise && !isPromise(paramsOrPromise)
            ? paramsOrPromise.constructor?.name ?? typeof paramsOrPromise
            : paramsOrPromise && isPromise(paramsOrPromise)
              ? "Promise"
              : paramsOrPromise === undefined
                ? "undefined"
                : typeof paramsOrPromise,
      });
      snapshots.push(snapshotSearchParams(paramsOrPromise));
    } catch (error) {
      resolutionError = error;
      console.error("🧭 Failed to resolve searchParams promise", { depth, error });
      paramsOrPromise = undefined;
      break;
    }
  }

  const params = (paramsOrPromise ?? undefined) as SearchParamSource | undefined;

  if (paramsOrPromise && !isPromise(paramsOrPromise)) {
    snapshots.push(snapshotSearchParams(params));
  }

  const lastResolvedType = params
    ? params.constructor?.name ?? typeof params
    : resolutionError
      ? "<error>"
      : null;

  return { params, promiseDepth: depth, resolutionError, snapshots, lastResolvedType };
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
  console.log("🧭 loadGrant invoked", {
    slug,
    rawSearchParams: searchParams ?? null,
    rawSearchParamsSummary: summarizeSearchParamInput(searchParams),
  });

  const { params: resolvedParams, promiseDepth, resolutionError, snapshots, lastResolvedType } =
    await normalizeSearchParams(searchParams);

  const idParam = resolveParam(resolvedParams, "id");
  const grantId = typeof idParam === "string" ? decodeURIComponent(idParam) : undefined;
  const short = extractShortIdFromSlug(slug);

  console.log("🧭 loadGrant params", {
    slug,
    idParam,
    decodedGrantId: grantId,
    shortIdFromSlug: short,
    searchParamsType: lastResolvedType,
    searchParamsPromiseDepth: promiseDepth,
    searchParamsResolutionError: resolutionError ? String(resolutionError) : null,
    searchParamsSnapshots: snapshots,
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
