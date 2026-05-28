import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Público — sem auth
  if (pathname.startsWith("/agendar")) return NextResponse.next();

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
