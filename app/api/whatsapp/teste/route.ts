import { NextResponse } from "next/server";
import { enviarWhatsApp } from "@/lib/webhook";

export async function POST(req: Request) {
  const { url, token, instance, telefone } = await req.json();

  if (!url || !token || !instance || !telefone) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
  }

  const ok = await enviarWhatsApp(telefone, "✅ Teste de WhatsApp do sistema de agendamento. Integração funcionando!", {
    whatsapp_url: url,
    whatsapp_token: token,
    whatsapp_instance: instance ?? "",
    whatsapp_ativo: true,
    whatsapp_notif_paciente: true,
    whatsapp_notif_clinica: true,
    whatsapp_telefone_clinica: null,
    whatsapp_template: null,
    webhook_url: null,
    webhook_ativo: false,
    nome_clinica: "Clínica",
  });

  if (ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "Falha ao enviar. Verifique as credenciais e se a instância está conectada." }, { status: 400 });
}
