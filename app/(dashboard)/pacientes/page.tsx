import { createAdminClient } from "@/lib/supabase";
import PacientesView from "@/components/crm/pacientes-view";
import type { CsPaciente } from "@/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

async function getData(): Promise<{ pacientes: CsPaciente[]; total: number }> {
  try {
    const supabase = createAdminClient();

    const { data: pacientes, error, count } = await supabase
      .from("cs_pacientes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (error || !pacientes?.length) return { pacientes: [], total: 0 };

    const ids = pacientes.map((p) => p.id);

    const [{ data: ags }, { data: notas }] = await Promise.all([
      supabase.from("cs_agendamentos").select("*").in("paciente_id", ids).order("data", { ascending: false }),
      supabase.from("cs_notas_paciente").select("*").in("paciente_id", ids).order("created_at", { ascending: false }),
    ]);

    return {
      pacientes: pacientes.map((p) => ({
        ...p,
        agendamentos: (ags ?? []).filter((a) => a.paciente_id === p.id),
        notas: (notas ?? []).filter((n) => n.paciente_id === p.id),
      })) as CsPaciente[],
      total: count ?? 0,
    };
  } catch (e) {
    console.error("[pacientes]", e);
    return { pacientes: [], total: 0 };
  }
}

export default async function PacientesPage() {
  const { pacientes, total } = await getData();
  return (
    <div style={{ padding: "24px", flex: 1 }}>
      <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "24px" }}>Pacientes</h1>
      <PacientesView initialData={pacientes} initialTotal={total} />
    </div>
  );
}
