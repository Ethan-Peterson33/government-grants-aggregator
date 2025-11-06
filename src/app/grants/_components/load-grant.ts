import type { Grant } from "@/lib/types";
import { getGrantById, getGrantByShortId } from "@/lib/search";

type SearchParamInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | { get: (key: string) => string | null; getAll?: (key: string) => string[] | undefined };

function extractShortIdFromSlug(slug: string | undefined | null): string | null {
  if (!slug || typeof slug !== "string") return null;
  const last = slug.split("-").at(-1);
  return last ? last.toLowerCase() : null;
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function resolveParam(searchParams: SearchParamInput | undefined, key: string): string | undefined {
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
  const idParam = resolveParam(searchParams, "id");
  const grantId = typeof idParam === "string" ? decodeURIComponent(idParam) : undefined;
  const short = extractShortIdFromSlug(slug);

  console.log("🧭 loadGrant params", {
    slug,
    idParam,
    decodedGrantId: grantId,
    shortIdFromSlug: short,
    searchParamsType: searchParams ? searchParams.constructor?.name ?? typeof searchParams : null,
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
