import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cs_pacientes")
    .select("nome, telefone")
    .order("nome");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const linhas = [
    "Nome,Telefone",
    ...(data ?? []).map((p) => `"${p.nome.replace(/"/g, '""')}","${p.telefone}"`),
  ];

  return new NextResponse(linhas.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
