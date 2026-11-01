import "server-only";

/**
 * Naive sliding-window limiter keyed by IP. In-memory per function instance — with Fluid
 * Compute instances are reused, so this catches casual spamming; it's not a hard guarantee
 * across regions/instances.
 */
const buckets = new Map<string, number[]>();

export function clientIp(req: Request) {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimit(req: Request, name: string, limit: number, windowMs: number) {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
    return { ok: false as const, retryAfter };
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true as const };
}

export function tooMany(retryAfter: number, message: string) {
  return Response.json({ error: message }, { status: 429, headers: { "retry-after": String(retryAfter) } });
}
