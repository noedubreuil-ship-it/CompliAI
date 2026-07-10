import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/** Préfixe de locale présent dans l'URL (uniquement 'en' ; 'fr' est sans préfixe). */
function detectLocalePrefix(pathname: string): string | null {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) return locale;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  // 1. next-intl : détection/négociation de la locale + cookie + rewrite éventuel.
  const response = intlMiddleware(request);

  // 2. Refresh de la session Supabase, en écrivant les cookies sur la réponse intl.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Redirections applicatives, en préservant la locale de l'URL.
  const { pathname } = request.nextUrl;
  const localePrefix = detectLocalePrefix(pathname);
  const bare = localePrefix ? pathname.slice(localePrefix.length + 1) || "/" : pathname;
  const withLocale = (p: string) => (localePrefix ? `/${localePrefix}${p === "/" ? "" : p}` : p);

  const loginRedirect = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = withLocale("/auth/login");
    url.search = "";
    url.searchParams.set("redirectTo", target);
    return NextResponse.redirect(url);
  };

  // Raccourcis publics → dashboard (auth requise)
  if (bare === "/chat" || bare.startsWith("/chat/")) {
    const target = withLocale("/dashboard/chat");
    return user ? NextResponse.redirect(new URL(target, request.url)) : loginRedirect(target);
  }
  if (bare === "/tools" || bare.startsWith("/tools/")) {
    const sub = bare === "/tools" ? "/dashboard/tools" : `/dashboard/tools${bare.slice("/tools".length)}`;
    const target = withLocale(sub);
    return user ? NextResponse.redirect(new URL(target, request.url)) : loginRedirect(target);
  }

  // Protection du dashboard
  if (bare.startsWith("/dashboard") && !user) {
    return loginRedirect(withLocale(bare));
  }

  // Utilisateur connecté sur la page de login → dashboard
  if (bare.startsWith("/auth/login") && user) {
    return NextResponse.redirect(new URL(withLocale("/dashboard"), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf api, assets Next et fichiers statiques.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
