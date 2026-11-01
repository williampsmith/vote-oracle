import { z } from "zod";
import { ACCESS_COOKIE, ACCESS_MAX_AGE, accessToken, safeEqual } from "@/lib/passcode";
import { rateLimit, tooMany } from "@/lib/ratelimit";

const body = z.object({ passcode: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const rl = rateLimit(req, "unlock", 8, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, "Too many tries. Wait a few minutes and try again.");
  const expected = process.env.APP_PASSCODE;
  if (!expected) return Response.json({ ok: true });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !safeEqual(parsed.data.passcode.trim(), expected)) {
    return Response.json({ error: "That passcode isn't right." }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.append(
    "set-cookie",
    `${ACCESS_COOKIE}=${await accessToken()}; Path=/; Max-Age=${ACCESS_MAX_AGE}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return res;
}
