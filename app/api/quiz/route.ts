import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("cs_quiz_perguntas").select("*").eq("ativo", true).order("ordem");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();
  if (Array.isArray(body)) {
    await supabase.from("cs_quiz_perguntas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { data, error } = await supabase.from("cs_quiz_perguntas").insert(body).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  const { data, error } = await supabase.from("cs_quiz_perguntas").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
