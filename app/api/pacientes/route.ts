import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { validate, validationError } from "@/lib/validate";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get("telefone");
  const busca = searchParams.get("busca")?.trim() ?? "";
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const supabase = createAdminClient();

  // Busca rápida por telefone (usado no agendamento público)
  if (telefone) {
    const { data } = await supabase
      .from("cs_pacientes")
      .select("id, nome, telefone, email")
      .ilike("telefone", `%${telefone.replace(/\D/g, "").slice(-8)}%`)
      .limit(5);
    return NextResponse.json(data ?? []);
  }

  let query = supabase
    .from("cs_pacientes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`);
  }

  const { data: pacientes, error, count } = await query;

  if (error) {
    console.error("[pacientes GET]", error.message);
    return NextResponse.json({ pacientes: [], total: 0 });
  }

  if (!pacientes?.length) return NextResponse.json({ pacientes: [], total: count ?? 0 });

  const ids = pacientes.map((p) => p.id);

  const [{ data: ags }, { data: notas }] = await Promise.all([
    supabase.from("cs_agendamentos").select("*").in("paciente_id", ids).order("data", { ascending: false }),
    supabase.from("cs_notas_paciente").select("*").in("paciente_id", ids).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    pacientes: pacientes.map((p) => ({
      ...p,
      agendamentos: (ags ?? []).filter((a) => a.paciente_id === p.id),
      notas: (notas ?? []).filter((n) => n.paciente_id === p.id),
    })),
    total: count ?? 0,
  });
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  const erros = validate(body, {
    nome:     [{ type: "required" }, { type: "string", min: 2, max: 120 }],
    telefone: [{ type: "required" }, { type: "string", min: 8, max: 20 }],
    email:    [{ type: "email" }],
  });
  if (erros.length) return validationError(erros);

  const { data, error } = await supabase
    .from("cs_pacientes")
    .insert({ nome: body.nome.trim(), telefone: body.telefone.trim(), email: body.email?.trim() || null, observacoes: body.observacoes || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
