// lib/utils.js

function sentenceCase(value) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
exports.sentenceCase = sentenceCase;
