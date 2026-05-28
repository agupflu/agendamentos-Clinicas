import { createAdminClient } from "@/lib/supabase";
import AgendamentosCrm from "@/components/crm/agendamentos-crm";
import type { CsAgendamento } from "@/types";

export const dynamic = "force-dynamic";

async function getData(): Promise<CsAgendamento[]> {
  try {
    const supabase = createAdminClient();

    // Tenta join direto
    const { data, error } = await supabase
      .from("cs_agendamentos")
      .select("*, paciente:cs_pacientes(*), profissional:cs_profissionais(*)")
      .order("data", { ascending: false })
      .order("hora");

    if (!error && data) return data as CsAgendamento[];

    // Fallback: queries separadas
    const { data: ags } = await supabase
      .from("cs_agendamentos")
      .select("*")
      .order("data", { ascending: false })
      .order("hora");

    if (!ags?.length) return [];

    const pacIds = Array.from(new Set(ags.map((a) => a.paciente_id).filter(Boolean)));
    const profIds = Array.from(new Set(ags.map((a) => a.profissional_id).filter(Boolean)));

    const [{ data: pacientes }, { data: profs }] = await Promise.all([
      pacIds.length ? supabase.from("cs_pacientes").select("*").in("id", pacIds) : Promise.resolve({ data: [] }),
      profIds.length ? supabase.from("cs_profissionais").select("*").in("id", profIds) : Promise.resolve({ data: [] }),
    ]);

    const pacMap = Object.fromEntries((pacientes ?? []).map((p) => [p.id, p]));
    const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    return ags.map((a) => ({
      ...a,
      paciente: a.paciente_id ? (pacMap[a.paciente_id] ?? null) : null,
      profissional: a.profissional_id ? (profMap[a.profissional_id] ?? null) : null,
    })) as CsAgendamento[];
  } catch (e) {
    console.error("[agendamentos]", e);
    return [];
  }
}

export default async function AgendamentosPage() {
  const agendamentos = await getData();
  return (
    <div style={{ padding: "24px", flex: 1 }}>
      <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "24px" }}>Agendamentos</h1>
      <AgendamentosCrm initialData={agendamentos} />
    </div>
  );
}
