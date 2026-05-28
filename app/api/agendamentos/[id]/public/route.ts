import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: ag, error } = await supabase
    .from("cs_agendamentos")
    .select("id, data, hora, status, paciente_id, profissional_id")
    .eq("id", params.id)
    .single();

  if (error || !ag) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
  if (ag.status === "cancelado") return NextResponse.json({ error: "Este agendamento já foi cancelado." }, { status: 410 });

  const [{ data: prof }, { data: config }] = await Promise.all([
    supabase
      .from("cs_profissionais")
      .select("id, nome, disponibilidade:cs_profissional_disponibilidade(*)")
      .eq("id", ag.profissional_id)
      .single(),
    supabase.from("cs_config").select("nome_clinica").limit(1).single(),
  ]);

  return NextResponse.json({
    id: ag.id,
    data: ag.data,
    hora: ag.hora,
    status: ag.status,
    profissional_id: ag.profissional_id,
    profissional_nome: prof?.nome ?? null,
    disponibilidade: prof?.disponibilidade ?? [],
    clinica: config?.nome_clinica ?? "Clínica",
  });
}
