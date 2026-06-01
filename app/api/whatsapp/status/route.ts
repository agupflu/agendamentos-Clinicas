import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("cs_config")
    .select("whatsapp_url, whatsapp_token")
    .limit(1)
    .single();

  if (!config?.whatsapp_url || !config?.whatsapp_token) {
    return NextResponse.json({ connected: false, qrcode: null, error: "Credenciais não configuradas." });
  }

  try {
    const r = await fetch(`${config.whatsapp_url.replace(/\/$/, "")}/instance/status`, {
      headers: { "token": config.whatsapp_token },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) return NextResponse.json({ connected: false, qrcode: null, error: "Erro ao consultar status." });

    const data = await r.json();
    return NextResponse.json({
      connected: data.connected ?? data.status?.connected ?? false,
      loggedIn: data.loggedIn ?? data.status?.loggedIn ?? false,
      qrcode: data.instance?.qrcode ?? null,
      status: data.instance?.status ?? "unknown",
      nome: data.instance?.name ?? "",
      numero: data.instance?.owner ?? data.jid ?? "",
    });
  } catch {
    return NextResponse.json({ connected: false, qrcode: null, error: "Sem resposta da API." });
  }
}

export async function POST() {
  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("cs_config")
    .select("whatsapp_url, whatsapp_token")
    .limit(1)
    .single();

  if (!config?.whatsapp_url || !config?.whatsapp_token) {
    return NextResponse.json({ error: "Credenciais não configuradas." }, { status: 400 });
  }

  try {
    const r = await fetch(`${config.whatsapp_url.replace(/\/$/, "")}/instance/connect`, {
      method: "POST",
      headers: { "token": config.whatsapp_token, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    return NextResponse.json({
      connected: data.connected ?? false,
      qrcode: data.instance?.qrcode ?? null,
      status: data.instance?.status ?? "unknown",
    });
  } catch {
    return NextResponse.json({ error: "Erro ao conectar." }, { status: 500 });
  }
}
