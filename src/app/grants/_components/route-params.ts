const PROMISE_FLAG = "then";

export type MaybePromise<T> = T | Promise<T>;

export type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | { get: (key: string) => string | null; getAll?: (key: string) => string[] | undefined };

function isPromise<T>(value: MaybePromise<T> | undefined): value is Promise<T> {
  return Boolean(value) && typeof (value as Promise<unknown>)[PROMISE_FLAG] === "function";
}

function snapshotRouteParams(value: Record<string, unknown> | undefined | null) {
  if (!value || typeof value !== "object") return null;
  return Object.fromEntries(
    Object.entries(value).map(([key, raw]) => {
      if (raw == null) return [key, raw];
      if (typeof raw === "string") return [key, raw];
      if (Array.isArray(raw)) return [key, raw.map((item) => String(item))];
      return [key, String(raw)];
    })
  );
}

function snapshotSearchParams(value: SearchParamsLike | undefined | null) {
  if (!value) return null;

  const getter = (value as URLSearchParams).get;
  if (typeof getter === "function") {
    const entries =
      typeof (value as URLSearchParams).entries === "function"
        ? Array.from((value as URLSearchParams).entries())
        : [];
    if (entries.length > 0) {
      return entries.reduce<Record<string, string | string[]>>((acc, [key, entryValue]) => {
        if (key in acc) {
          const existing = acc[key];
          acc[key] = Array.isArray(existing) ? [...existing, entryValue] : [existing, entryValue];
        } else {
          acc[key] = entryValue;
        }
        return acc;
      }, {});
    }

    const keys =
      typeof (value as URLSearchParams).keys === "function"
        ? Array.from((value as URLSearchParams).keys())
        : [];
    if (keys.length > 0) {
      return keys.reduce<Record<string, string | string[]>>((acc, key) => {
        const values =
          typeof (value as URLSearchParams).getAll === "function"
            ? (value as URLSearchParams).getAll(key)
            : [];
        if (values.length > 1) {
          acc[key] = values;
        } else if (values.length === 1) {
          acc[key] = values[0];
        } else {
          const single = getter.call(value as URLSearchParams, key);
          if (single != null) acc[key] = single;
        }
        return acc;
      }, {});
    }

    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, string | string[] | undefined>).map(([key, raw]) => [
      key,
      Array.isArray(raw) ? raw : raw ?? undefined,
    ])
  );
}

export async function resolveRouteParams<T extends Record<string, unknown>>(
  input: MaybePromise<T> | undefined,
  context: string
): Promise<T | undefined> {
  if (typeof input === "undefined") {
    console.log("🧭 resolveRouteParams missing input", { context });
    return undefined;
  }

  const promiseLike = isPromise(input);
  console.log("🧭 resolveRouteParams input", {
    context,
    isPromise: promiseLike,
    keys: !promiseLike && typeof input === "object" ? Object.keys(input as Record<string, unknown>) : null,
    constructorName:
      !promiseLike && input && typeof input === "object" ? (input as Record<string, unknown>).constructor?.name ?? null : null,
  });

  try {
    const resolved = await input;
    console.log("🧭 resolveRouteParams resolved", {
      context,
      keys: resolved ? Object.keys(resolved) : null,
      snapshot: snapshotRouteParams(resolved ?? null),
    });
    return resolved ?? undefined;
  } catch (error) {
    console.error("🧭 resolveRouteParams error", { context, error });
    return undefined;
  }
}

export async function resolveSearchParams(
  input: MaybePromise<SearchParamsLike | undefined> | undefined,
  context: string
): Promise<SearchParamsLike | undefined> {
  if (typeof input === "undefined" || input === null) {
    console.log("🧭 resolveSearchParams missing input", { context });
    return undefined;
  }

  const promiseLike = isPromise(input);
  console.log("🧭 resolveSearchParams input", {
    context,
    isPromise: promiseLike,
    constructorName:
      !promiseLike && input && typeof input === "object"
        ? (input as Record<string, unknown>).constructor?.name ?? null
        : null,
  });

  try {
    const resolved = await input;
    console.log("🧭 resolveSearchParams resolved", {
      context,
      snapshot: snapshotSearchParams(resolved ?? null),
    });
    return resolved ?? undefined;
  } catch (error) {
    console.error("🧭 resolveSearchParams error", { context, error });
    return undefined;
  }
}

export function extractSearchParam(
  searchParams: SearchParamsLike | undefined,
  key: string
): string | undefined {
  if (!searchParams) return undefined;

  const getter = (searchParams as URLSearchParams).get;
  if (typeof getter === "function") {
    if (typeof (searchParams as URLSearchParams).getAll === "function") {
      const values = (searchParams as URLSearchParams).getAll(key);
      if (values && values.length > 0) {
        return values[0] ?? undefined;
      }
    }
    const single = getter.call(searchParams as URLSearchParams, key);
    return single ?? undefined;
  }

  const raw = (searchParams as Record<string, string | string[] | undefined>)[key];
  if (Array.isArray(raw)) return raw[0];
  return raw ?? undefined;
}
