import { createAdminClient } from "@/lib/supabase";

type WaConfig = {
  whatsapp_url: string;
  whatsapp_token: string;
  whatsapp_instance: string;
  whatsapp_ativo: boolean;
  whatsapp_notif_paciente: boolean;
  whatsapp_notif_clinica: boolean;
  whatsapp_telefone_clinica: string | null;
  whatsapp_template: string | null;
  webhook_url: string | null;
  webhook_ativo: boolean;
  nome_clinica: string;
};

export async function enviarWhatsApp(
  telefone: string,
  mensagem: string,
  config: WaConfig
): Promise<boolean> {
  const numero = telefone.replace(/\D/g, "");
  if (!numero || numero.length < 8) return false;

  try {
    const url = `${config.whatsapp_url.replace(/\/$/, "")}/send/text`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": config.whatsapp_token,
      },
      body: JSON.stringify({ number: numero, text: mensagem }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function montarMensagemPaciente(
  template: string | null,
  dados: {
    nome: string;
    data: string;
    hora: string;
    profissional?: string;
    procedimento?: string;
    clinica: string;
    reagendamentoUrl?: string;
  }
): string {
  const padrao = `Olá ${dados.nome}! ✅\n\nSeu agendamento foi confirmado.\n📅 ${dados.data} às ${dados.hora}${dados.profissional ? `\n👨‍⚕️ ${dados.profissional}` : ""}${dados.procedimento ? `\n📋 ${dados.procedimento}` : ""}\n🏥 ${dados.clinica}${dados.reagendamentoUrl ? `\n\nPrecisa remarcar? Acesse:\n${dados.reagendamentoUrl}` : ""}`;

  if (!template) return padrao;

  return template
    .replace(/\{\{nome\}\}/g, dados.nome)
    .replace(/\{\{data\}\}/g, dados.data)
    .replace(/\{\{hora\}\}/g, dados.hora)
    .replace(/\{\{profissional\}\}/g, dados.profissional ?? "")
    .replace(/\{\{procedimento\}\}/g, dados.procedimento ?? "")
    .replace(/\{\{clinica\}\}/g, dados.clinica)
    .replace(/\{\{link\}\}/g, dados.reagendamentoUrl ?? "");
}

export function montarMensagemClinica(dados: {
  nome: string;
  telefone: string;
  data: string;
  hora: string;
  profissional?: string;
  procedimento?: string;
}): string {
  return `🔔 Novo agendamento!\n\n👤 ${dados.nome}\n📞 ${dados.telefone}\n📅 ${dados.data} às ${dados.hora}${dados.profissional ? `\n👨‍⚕️ ${dados.profissional}` : ""}${dados.procedimento ? `\n📋 ${dados.procedimento}` : ""}`;
}

export async function dispararWebhook(
  eventoId: string,
  payload: Record<string, unknown>
) {
  const supabase = createAdminClient();
  try {
    const { data: config } = await supabase
      .from("cs_config")
      .select("webhook_url, webhook_ativo, whatsapp_url, whatsapp_token, whatsapp_instance, whatsapp_ativo, whatsapp_notif_paciente, whatsapp_notif_clinica, whatsapp_telefone_clinica, whatsapp_template, nome_clinica")
      .limit(1)
      .single();

    if (!config) return;

    let statusFinal = "pendente";

    // ── WhatsApp via UazAPI ──────────────────────────────────────────
    if (config.whatsapp_ativo && config.whatsapp_url && config.whatsapp_token && config.whatsapp_instance) {
      const evento = payload.evento as string;

      if (evento === "novo_agendamento") {
        const paciente = payload.paciente as { nome?: string; telefone?: string } | undefined;
        const data = payload.data as string ?? "";
        const hora = payload.hora as string ?? "";
        const profissional = payload.profissional as string | undefined;
        const procedimento = payload.procedimento as string | undefined;
        const reagendamentoUrl = payload.reagendamento_url as string | undefined;

        // Notificar paciente
        if (config.whatsapp_notif_paciente && paciente?.telefone) {
          const msg = montarMensagemPaciente(config.whatsapp_template, {
            nome: paciente.nome ?? "Paciente",
            data, hora, profissional, procedimento,
            clinica: config.nome_clinica,
            reagendamentoUrl,
          });
          const ok = await enviarWhatsApp(paciente.telefone, msg, config as WaConfig);
          statusFinal = ok ? "enviado" : "erro";
        }

        // Notificar clínica
        if (config.whatsapp_notif_clinica && config.whatsapp_telefone_clinica) {
          const msg = montarMensagemClinica({
            nome: paciente?.nome ?? "Paciente",
            telefone: paciente?.telefone ?? "",
            data, hora, profissional, procedimento,
          });
          await enviarWhatsApp(config.whatsapp_telefone_clinica, msg, config as WaConfig);
        }
      }
    }

    // ── Webhook genérico (n8n etc.) ──────────────────────────────────
    if (config.webhook_ativo && config.webhook_url) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const r = await fetch(config.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (r.ok) statusFinal = "enviado";
      } catch { clearTimeout(timer); }
    }

    await supabase
      .from("cs_webhook_events")
      .update({ status: statusFinal })
      .eq("id", eventoId);
  } catch {
    // config unavailable — ignore
  }
}
