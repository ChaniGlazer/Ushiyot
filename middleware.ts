import { NextResponse, type NextRequest } from "next/server";
import { isShabbatNow } from "@/lib/hebcal";

const ALLOWED_PATHS = ["/privacy", "/shabbat"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ALLOWED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (await isShabbatNow()) {
    return NextResponse.rewrite(new URL("/shabbat", request.url));
  }

  return NextResponse.next();
}

// Excludes API routes (so cron jobs like the daily-ideas reminder keep working) and
// Next.js internals/static assets - only real page navigations pass through this.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
