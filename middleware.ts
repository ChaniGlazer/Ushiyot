import { NextResponse, type NextRequest } from "next/server";
import { isShabbatNow } from "@/lib/hebcal";

const ALLOWED_PATHS = ["/privacy", "/shabbat"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ALLOWED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Fail open: isShabbatNow() calls out to Hebcal (see lib/hebcal.ts), a third-party API with
  // no SLA, on every single page request. If that call fails or times out, treat it as "not
  // Shabbat" rather than letting the exception take down every page on the site.
  try {
    if (await isShabbatNow()) {
      return NextResponse.rewrite(new URL("/shabbat", request.url));
    }
  } catch (error) {
    console.error("[middleware] isShabbatNow() failed - failing open (not blocking as Shabbat)", error);
  }

  return NextResponse.next();
}

// Excludes API routes (so cron jobs like the daily-ideas reminder keep working) and
// Next.js internals/static assets - only real page navigations pass through this.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
