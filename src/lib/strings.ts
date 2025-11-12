export function slugify(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function wordsFromSlug(value: string): string {
  if (!value) return "";
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function normalizeCategory(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return "Other";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "Other";
  }

  const sanitized = trimmed.replace(/[_\s]+/g, "-").toLowerCase();
  const normalized = wordsFromSlug(sanitized);
  return normalized || "Other";
}
