import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const supabase = createAdminClient();
  const body = await req.json();
  const tabela = tipo === "profissional" ? "cs_profissional_bloqueios" : "cs_bloqueios";
  const { data, error } = await supabase.from(tabela).insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const supabase = createAdminClient();
  const { id } = await req.json();
  const tabela = tipo === "profissional" ? "cs_profissional_bloqueios" : "cs_bloqueios";
  const { error } = await supabase.from(tabela).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
