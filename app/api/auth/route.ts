import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, senha } = await req.json();
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
  const secret = (process.env.SESSION_SECRET || "").trim();

  if (email === adminEmail && senha === adminPassword) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("cs-session", secret, {
      httpOnly: true, sameSite: "lax", path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }
  return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("cs-session");
  return res;
}
