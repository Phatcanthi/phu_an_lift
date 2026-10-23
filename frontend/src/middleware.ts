import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";

/**
 * The default locale has no URL prefix: `/products` is served by the `[locale]` route as `/vi/products`
 * (rewritten, the address bar is unchanged) and an explicit `/vi/...` is redirected to the clean URL.
 * Other locales are served as they are (`/en/products`).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  // The HR dashboard is not part of the localized public site.
  if (first === "admin") return NextResponse.next();

  if (first === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }
  if (locales.some((l) => l === first)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

// Skip Next internals and anything with a file extension (images, models, favicon).
export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };
