import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessToken, passcodeEnabled, safeEqual } from "@/lib/passcode";

export async function proxy(req: NextRequest) {
  if (!passcodeEnabled()) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/unlock" || pathname === "/api/unlock") return NextResponse.next();

  const cookie = req.cookies.get(ACCESS_COOKIE)?.value ?? "";
  if (cookie && safeEqual(cookie, await accessToken())) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "This Vote Oracle is private. Reload the page to enter the passcode." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/unlock", req.url));
}

export const config = {
  matcher: ["/((?!_next/|questions/|favicon.ico|icon|apple-icon).*)"],
};
