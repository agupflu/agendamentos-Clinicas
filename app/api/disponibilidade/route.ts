import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { gerarSlots } from "@/lib/calendario";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data");
  const profissionalId = searchParams.get("profissional_id");
  if (!data) return NextResponse.json({ error: "data obrigatória" }, { status: 400 });

  const supabase = createAdminClient();
  const diaSemana = new Date(data + "T12:00:00").getDay();

  const configRes = await supabase.from("cs_config").select("duracao_consulta, intervalo_entre").limit(1).single();
  const duracao = configRes.data?.duracao_consulta ?? 30;
  const intervalo = configRes.data?.intervalo_entre ?? 0;

  let todos: string[] = [];

  if (profissionalId) {
    const { data: disps } = await supabase
      .from("cs_profissional_disponibilidade")
      .select("hora_inicio, hora_fim")
      .eq("profissional_id", profissionalId)
      .eq("dia_semana", diaSemana)
      .eq("ativo", true);

    if (!disps?.length) return NextResponse.json({ horarios: [] });

    for (const disp of disps) {
      todos.push(...gerarSlots(disp.hora_inicio, disp.hora_fim, duracao, intervalo));
    }
    todos = Array.from(new Set(todos)).sort();
  } else {
    const { data: disp } = await supabase
      .from("cs_disponibilidade")
      .select("hora_inicio, hora_fim")
      .eq("dia_semana", diaSemana)
      .eq("ativo", true)
      .single();

    if (!disp) return NextResponse.json({ horarios: [] });
    todos = gerarSlots(disp.hora_inicio, disp.hora_fim, duracao, intervalo);
  }

  const [bloqueiosRes, agendadosRes] = await Promise.all([
    profissionalId
      ? supabase.from("cs_profissional_bloqueios").select("hora_inicio, hora_fim").eq("profissional_id", profissionalId).eq("data", data)
      : supabase.from("cs_bloqueios").select("hora_inicio, hora_fim").eq("data", data),
    profissionalId
      ? supabase.from("cs_agendamentos").select("hora").eq("data", data).eq("profissional_id", profissionalId).in("status", ["pendente", "confirmado"])
      : supabase.from("cs_agendamentos").select("hora").eq("data", data).in("status", ["pendente", "confirmado"]),
  ]);

  const ocupados = new Set((agendadosRes.data ?? []).map((a) => a.hora));
  const bloqueados = bloqueiosRes.data ?? [];

  const disponiveis = todos.filter((h) => {
    if (ocupados.has(h)) return false;
    return !bloqueados.some((b) => {
      if (!b.hora_inicio) return true;
      return h >= b.hora_inicio && h < (b.hora_fim ?? "23:59");
    });
  });

  return NextResponse.json({ horarios: disponiveis });
}
