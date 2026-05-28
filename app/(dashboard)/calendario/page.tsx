import { createAdminClient } from "@/lib/supabase";
import CalendarioView from "@/components/calendario/calendario-view";
import type { CsAgendamento, CsBloqueio, CsDisponibilidade, CsConfig, CsProfissional } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData() {
  try {
    const supabase = createAdminClient();
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split("T")[0];
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0).toISOString().split("T")[0];

    const [configRes, disponRes, bloqueiosRes, agendamentosRes, profissionaisRes, bloqueiosProfRes] = await Promise.all([
      supabase.from("cs_config").select("*").limit(1).single(),
      supabase.from("cs_disponibilidade").select("*").order("dia_semana"),
      supabase.from("cs_bloqueios").select("*").gte("data", inicioMes).lte("data", fimMes),
      supabase.from("cs_agendamentos")
        .select("*, paciente:cs_pacientes(*), profissional:cs_profissionais(id,nome)")
        .gte("data", inicioMes).lte("data", fimMes).order("hora"),
      supabase.from("cs_profissionais")
        .select("*, disponibilidade:cs_profissional_disponibilidade(*)")
        .eq("ativo", true).order("nome"),
      supabase.from("cs_profissional_bloqueios")
        .select("*").gte("data", inicioMes).lte("data", fimMes),
    ]);

    return {
      config: configRes.data as CsConfig | null,
      disponibilidade: (disponRes.data ?? []) as CsDisponibilidade[],
      bloqueios: (bloqueiosRes.data ?? []) as CsBloqueio[],
      agendamentos: (agendamentosRes.data ?? []) as CsAgendamento[],
      profissionais: (profissionaisRes.data ?? []) as CsProfissional[],
      bloqueiosProfissionais: (bloqueiosProfRes.data ?? []) as (CsBloqueio & { profissional_id: string })[],
    };
  } catch (e) {
    console.error("[CalendarioPage]", e);
    return { config: null, disponibilidade: [], bloqueios: [], agendamentos: [], profissionais: [], bloqueiosProfissionais: [] };
  }
}

export default async function CalendarioPage() {
  const data = await getData();
  return <CalendarioView {...data} />;
}
