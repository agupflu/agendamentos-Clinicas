import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { dispararWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { data, error } = await supabase
    .from("cs_agendamentos")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.status === "cancelado") {
    const cancelPayload = { evento: "cancelamento", agendamento_id: params.id };
    const { data: evento } = await supabase
      .from("cs_webhook_events")
      .insert({ agendamento_id: params.id, tipo: "cancelamento", payload: cancelPayload, status: "pendente" })
      .select("id")
      .single();
    if (evento?.id) dispararWebhook(evento.id, cancelPayload);
  }
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("cs_agendamentos").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
