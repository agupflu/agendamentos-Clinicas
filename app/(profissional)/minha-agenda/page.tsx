import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import MinhaAgendaView from "@/components/profissional/minha-agenda-view";

export const dynamic = "force-dynamic";

async function getProfissionalId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("cs-prof-session")?.value;
  if (!session?.startsWith("prof:")) return null;
  return session.replace("prof:", "");
}

export default async function MinhaAgendaPage() {
  const profId = await getProfissionalId();
  if (!profId) redirect("/profissional/login");

  const supabase = createAdminClient();

  const [{ data: profissional }, { data: agendamentos }] = await Promise.all([
    supabase.from("cs_profissionais").select("id, nome, especialidade, foto_url").eq("id", profId).single(),
    supabase
      .from("cs_agendamentos")
      .select("*, paciente:cs_pacientes(id, nome, telefone, email)")
      .eq("profissional_id", profId)
      .gte("data", new Date().toISOString().split("T")[0])
      .order("data")
      .order("hora"),
  ]);

  if (!profissional) redirect("/profissional/login");

  return <MinhaAgendaView profissional={profissional} agendamentos={agendamentos ?? []} />;
}
