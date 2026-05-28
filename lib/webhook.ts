import { createAdminClient } from "@/lib/supabase";

export async function dispararWebhook(
  eventoId: string,
  payload: Record<string, unknown>
) {
  const supabase = createAdminClient();
  try {
    const { data: config } = await supabase
      .from("cs_config")
      .select("webhook_url, webhook_ativo, whatsapp_template")
      .limit(1)
      .single();

    if (!config?.webhook_ativo || !config?.webhook_url) return;

    const body = config.whatsapp_template
      ? { ...payload, whatsapp_template: config.whatsapp_template }
      : payload;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const r = await fetch(config.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      await supabase
        .from("cs_webhook_events")
        .update({ status: r.ok ? "enviado" : "erro", updated_at: new Date().toISOString() })
        .eq("id", eventoId);
    } catch {
      clearTimeout(timer);
      await supabase
        .from("cs_webhook_events")
        .update({ status: "erro", updated_at: new Date().toISOString() })
        .eq("id", eventoId);
    }
  } catch {
    // config unavailable — ignore
  }
}
