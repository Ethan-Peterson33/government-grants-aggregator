import type { Grant } from "@/lib/types";
import { getGrantById, getGrantByShortId } from "@/lib/search";

function extractShortIdFromSlug(slug: string | undefined | null): string | null {
  if (!slug || typeof slug !== "string") return null;
  const last = slug.split("-").at(-1);
  return last ? last.toLowerCase() : null;
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function loadGrant(
  slug: string,
  searchParams?: Record<string, string | string[] | undefined>
): Promise<Grant | null> {
  const idParam = getSingleParam(searchParams?.id);
  const grantId = typeof idParam === "string" ? decodeURIComponent(idParam) : undefined;
  const short = extractShortIdFromSlug(slug);

  console.log("🧭 loadGrant params", {
    slug,
    idParam,
    decodedGrantId: grantId,
    shortIdFromSlug: short,
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
