import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { dispararWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cs_webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { id } = await req.json();
  const supabase = createAdminClient();

  const { data: evento } = await supabase
    .from("cs_webhook_events")
    .select("id, payload")
    .eq("id", id)
    .single();

  if (!evento) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  await supabase
    .from("cs_webhook_events")
    .update({ status: "pendente", updated_at: new Date().toISOString() })
    .eq("id", id);

  await dispararWebhook(evento.id, evento.payload);

  const { data: updated } = await supabase
    .from("cs_webhook_events")
    .select("status")
    .eq("id", id)
    .single();

  return NextResponse.json({ status: updated?.status ?? "pendente" });
}
