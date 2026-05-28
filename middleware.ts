import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Rotas públicas
  if (pathname.startsWith("/agendar")) return NextResponse.next();

  // ── Área do profissional ──────────────────────────────────────────
  const isProfLogin = pathname === "/profissional/login";
  const profCookie = request.cookies.get("cs-prof-session")?.value;
  const profAuthed = Boolean(profCookie?.startsWith("prof:"));

  if (pathname === "/minha-agenda") {
    if (!profAuthed) {
      const url = request.nextUrl.clone();
      url.pathname = "/profissional/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isProfLogin) {
    if (profAuthed) {
      const url = request.nextUrl.clone();
      url.pathname = "/minha-agenda";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Área do admin ─────────────────────────────────────────────────
  const isLogin = pathname === "/login";
  const secret = (process.env.SESSION_SECRET || "").trim();
  const cookie = request.cookies.get("cs-session")?.value;
  const authed = Boolean(secret) && cookie === secret;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = authed ? "/inicio" : "/login";
    return NextResponse.redirect(url);
  }

  if (!authed && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
