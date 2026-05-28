import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createAdminClient();
  const body = await req.json();
  await supabase.from("cs_disponibilidade").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data, error } = await supabase.from("cs_disponibilidade").insert(body).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
