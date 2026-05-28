import { createAdminClient } from "@/lib/supabase";
import ConfigView from "@/components/crm/config-view";
import type { CsConfig, CsQuizPergunta, CsDisponibilidade } from "@/types";

export const dynamic = "force-dynamic";

async function getData() {
  try {
    const supabase = createAdminClient();
    const [configRes, quizRes, disponRes] = await Promise.all([
      supabase.from("cs_config").select("*").limit(1).single(),
      supabase.from("cs_quiz_perguntas").select("*").order("ordem"),
      supabase.from("cs_disponibilidade").select("*").order("dia_semana"),
    ]);
    return { config: configRes.data as CsConfig | null, quiz: (quizRes.data ?? []) as CsQuizPergunta[], disponibilidade: (disponRes.data ?? []) as CsDisponibilidade[] };
  } catch { return { config: null, quiz: [], disponibilidade: [] }; }
}

export default async function ConfigPage() {
  const data = await getData();
  return (
    <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
      <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "24px" }}>Configurações</h1>
      <ConfigView {...data} />
    </div>
  );
}
