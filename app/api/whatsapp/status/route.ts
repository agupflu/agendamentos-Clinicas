import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getCredentials(url?: string, token?: string) {
  if (url && token) return { url, token };
  const supabase = createAdminClient();
  const { data } = await supabase.from("cs_config").select("whatsapp_url, whatsapp_token").limit(1).single();
  return { url: data?.whatsapp_url ?? "", token: data?.whatsapp_token ?? "" };
}

async function buscarStatus(url: string, token: string) {
  const r = await fetch(`${url.replace(/\/$/, "")}/instance/status`, {
    headers: { "token": token },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return {
    connected: data.connected ?? data.status?.connected ?? false,
    loggedIn: data.loggedIn ?? data.status?.loggedIn ?? false,
    qrcode: data.instance?.qrcode ?? null,
    status: data.instance?.status ?? "unknown",
    numero: data.instance?.owner ?? data.jid ?? "",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get("url") ?? undefined;
  const tokenParam = searchParams.get("token") ?? undefined;

  const { url, token } = await getCredentials(urlParam, tokenParam);
  if (!url || !token) {
    return NextResponse.json({ connected: false, qrcode: null, error: "Credenciais não configuradas. Salve a URL e o Token primeiro." });
  }

  try {
    return NextResponse.json(await buscarStatus(url, token));
  } catch (e) {
    return NextResponse.json({ connected: false, qrcode: null, error: String(e) });
  }
}

export async function POST(req: Request) {
  let body: { url?: string; token?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const { url, token } = await getCredentials(body.url, body.token);
  if (!url || !token) {
    return NextResponse.json({ error: "Credenciais não configuradas." }, { status: 400 });
  }

  try {
    // Chama /instance/connect para gerar/renovar QR code
    const r = await fetch(`${url.replace(/\/$/, "")}/instance/connect`, {
      method: "POST",
      headers: { "token": token, "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();

    // Se connect retornou o QR, usa ele; senão busca o status
    if (data.instance?.qrcode) {
      return NextResponse.json({
        connected: data.connected ?? false,
        qrcode: data.instance.qrcode,
        status: data.instance?.status ?? "connecting",
        numero: data.instance?.owner ?? "",
      });
    }

    // Fallback: buscar status que também tem o QR
    return NextResponse.json(await buscarStatus(url, token));
  } catch (e) {
    return NextResponse.json({ connected: false, qrcode: null, error: String(e) }, { status: 500 });
  }
}
