import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function sentenceCase(value: string) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
/**
 * Randomly shuffle an array and return a subset of N items.
 * @param arr - The array to pick from
 * @param count - How many items to return (default 3)
 */
export function pickRandom<T>(arr: T[], count = 3): T[] {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}