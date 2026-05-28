import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("cs_agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");
  return NextResponse.json({ count: count ?? 0 });
}
