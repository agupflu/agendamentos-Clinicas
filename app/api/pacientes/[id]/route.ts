import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cs_pacientes")
    .select("*, agendamentos:cs_agendamentos(*), notas:cs_notas_paciente(*)")
    .eq("id", params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { data, error } = await supabase.from("cs_pacientes").update({ ...body, updated_at: new Date().toISOString() }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — adicionar nota
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { conteudo } = await req.json();
  const { data, error } = await supabase.from("cs_notas_paciente").insert({ paciente_id: params.id, conteudo }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
