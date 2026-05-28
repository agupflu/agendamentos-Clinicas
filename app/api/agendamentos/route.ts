import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { NovoAgendamentoInput } from "@/types";
import { somarMinutos } from "@/lib/calendario";
import { dispararWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cs_agendamentos")
    .select("*, paciente:cs_pacientes(*), profissional:cs_profissionais(*)")
    .order("data", { ascending: false })
    .order("hora");

  if (!error && data) return NextResponse.json(data);

  // Fallback: separate queries
  const { data: ags } = await supabase
    .from("cs_agendamentos")
    .select("*")
    .order("data", { ascending: false })
    .order("hora");

  if (!ags?.length) return NextResponse.json([]);

  const pacienteIds = Array.from(new Set(ags.map((a) => a.paciente_id).filter(Boolean)));
  const profIds = Array.from(new Set(ags.map((a) => a.profissional_id).filter(Boolean)));

  const [{ data: pacientes }, { data: profs }] = await Promise.all([
    pacienteIds.length ? supabase.from("cs_pacientes").select("*").in("id", pacienteIds) : Promise.resolve({ data: [] }),
    profIds.length ? supabase.from("cs_profissionais").select("*").in("id", profIds) : Promise.resolve({ data: [] }),
  ]);

  const pacMap = Object.fromEntries((pacientes ?? []).map((p) => [p.id, p]));
  const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));

  return NextResponse.json(
    ags.map((a) => ({
      ...a,
      paciente: a.paciente_id ? (pacMap[a.paciente_id] ?? null) : null,
      profissional: a.profissional_id ? (profMap[a.profissional_id] ?? null) : null,
    }))
  );
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body: NovoAgendamentoInput = await req.json();

  let pacienteId: string;
  const { data: existente } = await supabase
    .from("cs_pacientes")
    .select("id")
    .eq("telefone", body.paciente.telefone)
    .limit(1)
    .single();

  if (existente?.id) {
    pacienteId = existente.id;
    await supabase
      .from("cs_pacientes")
      .update({ nome: body.paciente.nome, email: body.paciente.email ?? null })
      .eq("id", pacienteId);
  } else {
    const { data: novo, error } = await supabase
      .from("cs_pacientes")
      .insert({ nome: body.paciente.nome, telefone: body.paciente.telefone, email: body.paciente.email ?? null })
      .select()
      .single();
    if (error || !novo) return NextResponse.json({ error: error?.message ?? "Erro ao criar paciente" }, { status: 500 });
    pacienteId = novo.id;
  }

  const { data: conf } = await supabase.from("cs_config").select("duracao_consulta").limit(1).single();
  const duracao = conf?.duracao_consulta ?? 30;

  let conflictoQuery = supabase
    .from("cs_agendamentos")
    .select("id")
    .eq("data", body.data)
    .eq("hora", body.hora)
    .in("status", ["pendente", "confirmado"]);

  if (body.profissional_id) {
    conflictoQuery = conflictoQuery.eq("profissional_id", body.profissional_id);
  }

  const { data: conflito } = await conflictoQuery.limit(1).single();
  if (conflito) return NextResponse.json({ error: "Horário já ocupado." }, { status: 409 });

  const { data: ag, error } = await supabase
    .from("cs_agendamentos")
    .insert({
      paciente_id: pacienteId,
      profissional_id: body.profissional_id ?? null,
      data: body.data,
      hora: body.hora,
      hora_fim: somarMinutos(body.hora, duracao),
      tipo_agendamento: body.tipo_agendamento ?? null,
      procedimento_id: body.procedimento_id ?? null,
      procedimento: body.procedimento ?? null,
      sintoma_relatado: body.sintoma_relatado ?? null,
      quiz_respostas: body.quiz_respostas,
      origem: body.origem ?? "online",
      status: "pendente",
    })
    .select()
    .single();

  if (error || !ag) return NextResponse.json({ error: error?.message ?? "Erro ao criar agendamento" }, { status: 500 });

  const baseUrl = new URL(req.url).origin;
  const eventPayload = {
    evento: "novo_agendamento",
    agendamento_id: ag.id,
    paciente: body.paciente,
    profissional_id: body.profissional_id,
    tipo_agendamento: body.tipo_agendamento,
    procedimento: body.procedimento,
    data: body.data,
    hora: body.hora,
    reagendamento_url: `${baseUrl}/agendar/reagendar/${ag.id}`,
  };

  const { data: evento } = await supabase
    .from("cs_webhook_events")
    .insert({ agendamento_id: ag.id, tipo: "novo_agendamento", payload: eventPayload, status: "pendente" })
    .select("id")
    .single();

  if (evento?.id) {
    dispararWebhook(evento.id, eventPayload); // fire and forget
  }

  return NextResponse.json({ id: ag.id, ok: true }, { status: 201 });
}
