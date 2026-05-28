import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { validate, validationError } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cs_procedimentos")
    .select("*")
    .eq("ativo", true)
    .order("ordem")
    .order("nome");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();

  const erros = validate(body, {
    nome:      [{ type: "required" }, { type: "string", min: 2, max: 100 }],
    categoria: [{ type: "required" }, { type: "enum", values: ["avaliacao", "retorno", "ambos"] }],
  });
  if (erros.length) return validationError(erros);

  const { data, error } = await supabase.from("cs_procedimentos").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: Request) {
  const supabase = createAdminClient();
  const { id, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const erros = validate(rest, {
    nome:      [{ type: "string", min: 2, max: 100 }],
    categoria: [{ type: "enum", values: ["avaliacao", "retorno", "ambos"] }],
  });
  if (erros.length) return validationError(erros);

  const { data, error } = await supabase.from("cs_procedimentos").update(rest).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const { error } = await supabase.from("cs_procedimentos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
