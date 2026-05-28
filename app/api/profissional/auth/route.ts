import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { email, senha } = await req.json();
  if (!email || !senha) return NextResponse.json({ error: "Email e senha obrigatórios." }, { status: 400 });

  const supabase = createAdminClient();
  const { data: prof } = await supabase
    .from("cs_profissionais")
    .select("id, nome, especialidade, foto_url")
    .eq("email", email.trim())
    .eq("senha", senha)
    .eq("ativo", true)
    .single();

  if (!prof) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });

  const sessionValue = `prof:${prof.id}`;
  const res = NextResponse.json({ ok: true, profissional: prof });
  res.cookies.set("cs-prof-session", sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("cs-prof-session");
  return res;
}
