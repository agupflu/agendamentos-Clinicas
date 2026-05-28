import { createAdminClient } from "@/lib/supabase";
import PacientesView from "@/components/crm/pacientes-view";
import type { CsPaciente } from "@/types";

export const dynamic = "force-dynamic";

async function getData(): Promise<CsPaciente[]> {
  try {
    const supabase = createAdminClient();

    const { data: pacientes, error } = await supabase
      .from("cs_pacientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !pacientes?.length) return [];

    const ids = pacientes.map((p) => p.id);

    const [{ data: ags }, { data: notas }] = await Promise.all([
      supabase.from("cs_agendamentos").select("*").in("paciente_id", ids).order("data", { ascending: false }),
      supabase.from("cs_notas_paciente").select("*").in("paciente_id", ids).order("created_at", { ascending: false }),
    ]);

    return pacientes.map((p) => ({
      ...p,
      agendamentos: (ags ?? []).filter((a) => a.paciente_id === p.id),
      notas: (notas ?? []).filter((n) => n.paciente_id === p.id),
    })) as CsPaciente[];
  } catch (e) {
    console.error("[pacientes]", e);
    return [];
  }
}

export default async function PacientesPage() {
  const pacientes = await getData();
  return (
    <div style={{ padding: "24px", flex: 1 }}>
      <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "24px" }}>Pacientes</h1>
      <PacientesView initialData={pacientes} />
    </div>
  );
}
