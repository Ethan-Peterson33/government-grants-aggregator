// lib/slug.js
const { inferGrantLocation } = require("./grant-location");
const { slugify } = require("./strings");

function shortId(uuid) {
  if (!uuid || typeof uuid !== "string") return "";
  const firstSegment = uuid.split("-")[0];
  return (firstSegment || String(uuid)).toLowerCase();
}

function grantSlug(title, id) {
  const base = slugify(title || "");
  const idSegment = shortId(id);
  return base ? `${base}-${idSegment}` : idSegment;
}

function withIdQuery(path, id) {
  if (!id || typeof id !== "string") return path;
  const trimmed = id.trim();
  if (!trimmed) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}id=${encodeURIComponent(trimmed)}`;
}

function grantPath(grant) {
  const slugValue = grantSlug(grant.title || "", grant.id || "");
  const finalSlug = slugValue || (typeof grant.id === "string" ? shortId(grant.id) : "item");
  const location = inferGrantLocation(grant);
  const grantId = typeof grant.id === "string" ? grant.id : "";

  if (location.jurisdiction === "federal") {
    return withIdQuery(`/grants/federal/${finalSlug}`, grantId);
  }

  if (location.jurisdiction === "state") {
    return withIdQuery(
      `/grants/state/${location.stateCode.toUpperCase()}/${finalSlug}`,
      grantId
    );
  }

  return withIdQuery(
    `/grants/local/${location.stateCode.toUpperCase()}/${location.citySlug}/${finalSlug}`,
    grantId
  );
}

function normalizeCandidate(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function deriveAgencySlug(candidates = {}) {
  const ordered = [
    normalizeCandidate(candidates.slug),
    normalizeCandidate(candidates.agency_code),
    normalizeCandidate(candidates.agency_name),
    normalizeCandidate(candidates.agency),
  ];

  for (const value of ordered) {
    if (value) {
      return slugify(value);
    }
  }

  return "";
}

module.exports = {
  shortId,
  grantSlug,
  grantPath,
  deriveAgencySlug,
  buildGrantPath: grantPath,
};
