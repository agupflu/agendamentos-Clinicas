import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const [profRes, dispRes, vinculosRes] = await Promise.all([
    supabase.from("cs_profissionais").select("*").eq("id", params.id).single(),
    supabase.from("cs_profissional_disponibilidade").select("*").eq("profissional_id", params.id).order("dia_semana").order("hora_inicio"),
    supabase.from("cs_profissional_procedimentos").select("procedimento_id").eq("profissional_id", params.id),
  ]);

  if (profRes.error || !profRes.data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    ...profRes.data,
    disponibilidade: dispRes.data ?? [],
    procedimento_ids: (vinculosRes.data ?? []).map((v) => v.procedimento_id),
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { procedimento_ids, disponibilidade, ...rest } = body;

  const { data, error } = await supabase
    .from("cs_profissionais")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (procedimento_ids !== undefined) {
    await supabase.from("cs_profissional_procedimentos").delete().eq("profissional_id", params.id);
    if (procedimento_ids.length) {
      await supabase.from("cs_profissional_procedimentos").insert(
        procedimento_ids.map((pid: string) => ({ profissional_id: params.id, procedimento_id: pid }))
      );
    }
  }

  if (disponibilidade !== undefined) {
    // Replace all ranges: delete existing, insert new
    await supabase.from("cs_profissional_disponibilidade").delete().eq("profissional_id", params.id);
    if (disponibilidade.length) {
      await supabase.from("cs_profissional_disponibilidade").insert(
        disponibilidade.map((d: Record<string, unknown>) => ({ ...d, profissional_id: params.id }))
      );
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("cs_profissionais").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
