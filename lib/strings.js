// lib/strings.js

function slugify(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
exports.slugify = slugify;

function wordsFromSlug(value) {
  if (!value) return "";
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
exports.wordsFromSlug = wordsFromSlug;
