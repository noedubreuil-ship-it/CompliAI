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

/**
 * La langue la plus prioritaire du navigateur est-elle le français ?
 * Sert à choisir le repli : francophone → FR (défaut), sinon → EN (international).
 */
function prefersFrench(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  const top = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q)[0];
  return top?.tag.startsWith("fr") ?? false;
}

const COOKIE_NAME = routing.localeCookie && typeof routing.localeCookie === "object"
  ? routing.localeCookie.name ?? "NEXT_LOCALE"
  : "NEXT_LOCALE";

export async function middleware(request: NextRequest) {
  const { pathname: rawPath } = request.nextUrl;
  const hasLocaleCookie = request.cookies.has(COOKIE_NAME);
  const existingPrefix = detectLocalePrefix(rawPath);

  // Repli international : un visiteur sans préférence enregistrée dont le
  // navigateur n'est PAS francophone est envoyé vers /en (l'anglais est la
  // langue par défaut des non-francophones). On évite /auth (flux OAuth).
  if (
    !hasLocaleCookie &&
    !existingPrefix &&
    !rawPath.startsWith("/auth") &&
    !prefersFrench(request.headers.get("accept-language"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${rawPath === "/" ? "" : rawPath}`;
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(COOKIE_NAME, "en", { maxAge: 60 * 60 * 24 * 365, path: "/" });
    return redirect;
  }

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
