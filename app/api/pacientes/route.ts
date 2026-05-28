import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get("telefone");
  const supabase = createAdminClient();

  // Busca rápida por telefone — retorna só dados básicos
  if (telefone) {
    const { data } = await supabase
      .from("cs_pacientes")
      .select("id, nome, telefone, email")
      .ilike("telefone", `%${telefone.replace(/\D/g, "").slice(-8)}%`)
      .limit(5);
    return NextResponse.json(data ?? []);
  }

  const { data: pacientes, error } = await supabase
    .from("cs_pacientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[pacientes GET]", error.message);
    return NextResponse.json([]);
  }

  if (!pacientes?.length) return NextResponse.json([]);

  const ids = pacientes.map((p) => p.id);

  const [{ data: ags }, { data: notas }] = await Promise.all([
    supabase.from("cs_agendamentos").select("*").in("paciente_id", ids).order("data", { ascending: false }),
    supabase.from("cs_notas_paciente").select("*").in("paciente_id", ids).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json(
    pacientes.map((p) => ({
      ...p,
      agendamentos: (ags ?? []).filter((a) => a.paciente_id === p.id),
      notas: (notas ?? []).filter((n) => n.paciente_id === p.id),
    }))
  );
}
