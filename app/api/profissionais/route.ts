import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const procedimentoId = searchParams.get("procedimento_id");
  const supabase = createAdminClient();

  // Try join first, fallback to separate queries
  const { data: joined, error } = await supabase
    .from("cs_profissionais")
    .select("*, disponibilidade:cs_profissional_disponibilidade(*)")
    .eq("ativo", true)
    .order("nome");

  let profissionais: Record<string, unknown>[];

  if (!error && joined) {
    profissionais = joined;
  } else {
    const { data: list } = await supabase.from("cs_profissionais").select("*").eq("ativo", true).order("nome");
    if (!list?.length) return NextResponse.json([]);
    const ids = list.map((p) => p.id);
    const { data: disps } = await supabase.from("cs_profissional_disponibilidade").select("*").in("profissional_id", ids);
    const dispMap: Record<string, unknown[]> = {};
    for (const d of disps ?? []) {
      if (!dispMap[d.profissional_id]) dispMap[d.profissional_id] = [];
      dispMap[d.profissional_id].push(d);
    }
    profissionais = list.map((p) => ({ ...p, disponibilidade: dispMap[p.id] ?? [] }));
  }

  if (!procedimentoId) return NextResponse.json(profissionais);

  const { data: vinculos } = await supabase
    .from("cs_profissional_procedimentos")
    .select("profissional_id")
    .eq("procedimento_id", procedimentoId);

  const ids = new Set((vinculos ?? []).map((v) => v.profissional_id));
  return NextResponse.json(profissionais.filter((p: Record<string, unknown>) => ids.has(p.id as string)));
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { procedimento_ids, disponibilidade, ...rest } = body;

  const { data, error } = await supabase.from("cs_profissionais").insert(rest).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Erro" }, { status: 500 });

  if (procedimento_ids?.length) {
    await supabase.from("cs_profissional_procedimentos").insert(
      procedimento_ids.map((pid: string) => ({ profissional_id: data.id, procedimento_id: pid }))
    );
  }

  if (disponibilidade?.length) {
    await supabase.from("cs_profissional_disponibilidade").insert(
      disponibilidade.map((d: Record<string, unknown>) => ({ ...d, profissional_id: data.id }))
    );
  }

  return NextResponse.json(data, { status: 201 });
}
