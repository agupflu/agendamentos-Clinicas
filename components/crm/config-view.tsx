"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Building2, Zap, Clock, Link2, RefreshCw, RotateCcw, MessageCircle, Send } from "lucide-react";
import type { CsConfig, CsQuizPergunta, CsDisponibilidade } from "@/types";
import { DIAS_COMPLETOS } from "@/lib/calendario";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";
type Tab = "clinica" | "quiz" | "horarios" | "whatsapp" | "webhook";

interface Props { config: CsConfig | null; quiz: CsQuizPergunta[]; disponibilidade: CsDisponibilidade[] }

export default function ConfigView({ config, quiz: initQuiz, disponibilidade: initDispon }: Props) {
  const [tab, setTab] = useState<Tab>("clinica");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [clinica, setClinica] = useState({
    nome_clinica: config?.nome_clinica ?? "",
    especialidade: config?.especialidade ?? "",
    descricao: config?.descricao ?? "",
    telefone: config?.telefone ?? "",
    endereco: config?.endereco ?? "",
    duracao_consulta: config?.duracao_consulta ?? 30,
    intervalo_entre: config?.intervalo_entre ?? 0,
    dias_antecedencia: config?.dias_antecedencia ?? 30,
  });

  const [quiz, setQuiz] = useState<Partial<CsQuizPergunta>[]>(initQuiz);

  const [dispon, setDispon] = useState<Partial<CsDisponibilidade>[]>(
    [0,1,2,3,4,5,6].map((dia) => {
      const ex = initDispon.find((d) => d.dia_semana === dia);
      return ex ?? { dia_semana: dia, hora_inicio: "09:00", hora_fim: "18:00", ativo: false };
    })
  );

  const [webhookUrl, setWebhookUrl] = useState(config?.webhook_url ?? "");
  const [webhookAtivo, setWebhookAtivo] = useState(config?.webhook_ativo ?? false);
  const [whatsappTemplate, setWhatsappTemplate] = useState(config?.whatsapp_template ?? "");

  // WhatsApp
  const [waUrl, setWaUrl] = useState(config?.whatsapp_url ?? "");
  const [waToken, setWaToken] = useState(config?.whatsapp_token ?? "");
  const [waInstance, setWaInstance] = useState(config?.whatsapp_instance ?? "");
  const [waAtivo, setWaAtivo] = useState(config?.whatsapp_ativo ?? false);
  const [waNotifPaciente, setWaNotifPaciente] = useState(config?.whatsapp_notif_paciente ?? true);
  const [waNotifClinica, setWaNotifClinica] = useState(config?.whatsapp_notif_clinica ?? true);
  const [waTelClinica, setWaTelClinica] = useState(config?.whatsapp_telefone_clinica ?? "");
  const [waTeste, setWaTeste] = useState("");
  const [waTestando, setWaTestando] = useState(false);
  const [waTesteMsg, setWaTesteMsg] = useState("");
  const [waStatus, setWaStatus] = useState<{ connected: boolean; qrcode: string | null; status?: string; numero?: string } | null>(null);
  const [waCarregandoStatus, setWaCarregandoStatus] = useState(false);
  const [waConectando, setWaConectando] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [reprocessando, setReprocessando] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "webhook") carregarEventos();
  }, [tab]);

  async function carregarEventos() {
    setLoadingEventos(true);
    try {
      const r = await fetch("/api/webhooks");
      if (r.ok) setEventos(await r.json());
    } finally { setLoadingEventos(false); }
  }

  async function reprocessar(id: string) {
    setReprocessando(id);
    try {
      const r = await fetch("/api/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (r.ok) {
        const { status } = await r.json();
        setEventos((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
      }
    } finally { setReprocessando(null); }
  }

  function ok() { setSavedMsg("Salvo!"); setTimeout(() => setSavedMsg(""), 2000); }

  async function saveClinica() {
    setSaving(true);
    try { await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clinica) }); ok(); }
    finally { setSaving(false); }
  }

  async function saveQuiz() {
    setSaving(true);
    try { await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(quiz.map((p, i) => ({ ...p, ordem: i + 1 }))) }); ok(); }
    finally { setSaving(false); }
  }

  async function saveDispon() {
    setSaving(true);
    try {
      const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      // Salva via config API usando campo especial
      const r = await fetch("/api/disponibilidade-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dispon) });
      if (r.ok) ok();
    } finally { setSaving(false); }
  }

  async function saveWebhook() {
    setSaving(true);
    try { await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook_url: webhookUrl, webhook_ativo: webhookAtivo, whatsapp_template: whatsappTemplate || null }) }); ok(); }
    finally { setSaving(false); }
  }

  async function saveWhatsapp() {
    setSaving(true);
    try {
      await fetch("/api/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_url: waUrl || null,
          whatsapp_token: waToken || null,
          whatsapp_instance: waInstance || null,
          whatsapp_ativo: waAtivo,
          whatsapp_notif_paciente: waNotifPaciente,
          whatsapp_notif_clinica: waNotifClinica,
          whatsapp_telefone_clinica: waTelClinica || null,
          whatsapp_template: whatsappTemplate || null,
        }),
      });
      ok();
    } finally { setSaving(false); }
  }

  async function verificarStatus() {
    if (!waUrl || !waToken) { setWaStatus({ connected: false, qrcode: null, status: "error" }); return; }
    setWaCarregandoStatus(true);
    try {
      const params = new URLSearchParams({ url: waUrl, token: waToken });
      const r = await fetch(`/api/whatsapp/status?${params}`);
      const d = await r.json();
      setWaStatus(d);
    } finally { setWaCarregandoStatus(false); }
  }

  async function conectarWhatsapp() {
    if (!waUrl || !waToken) return;
    setWaConectando(true);
    try {
      const r = await fetch("/api/whatsapp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: waUrl, token: waToken }),
      });
      const d = await r.json();
      setWaStatus(d);
    } finally { setWaConectando(false); }
  }

  async function testarWhatsapp() {
    if (!waUrl || !waToken || !waInstance || !waTeste) return;
    setWaTestando(true);
    setWaTesteMsg("");
    try {
      const r = await fetch("/api/whatsapp/teste", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: waUrl, token: waToken, instance: waInstance, telefone: waTeste }),
      });
      const d = await r.json();
      setWaTesteMsg(r.ok ? "✅ Mensagem enviada com sucesso!" : `❌ ${d.error}`);
    } catch { setWaTesteMsg("❌ Erro de conexão."); }
    finally { setWaTestando(false); }
  }

  const TABS = [
    { key: "clinica" as Tab, label: "Clínica", icon: <Building2 size={13} /> },
    { key: "quiz" as Tab, label: "Quiz", icon: <Zap size={13} /> },
    { key: "horarios" as Tab, label: "Horários", icon: <Clock size={13} /> },
    { key: "whatsapp" as Tab, label: "WhatsApp", icon: <MessageCircle size={13} /> },
    { key: "webhook" as Tab, label: "Webhook", icon: <Link2 size={13} /> },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${BORDER}`, marginBottom: "28px" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "9px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.key ? ACCENT : "transparent"}`, color: tab === t.key ? ACCENT : "#9A9288", cursor: "pointer", fontSize: "13px", fontWeight: tab === t.key ? "600" : "400", display: "flex", alignItems: "center", gap: "6px", marginBottom: "-1px" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "clinica" && (
        <div style={{ maxWidth: "520px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            { label: "Nome da clínica", key: "nome_clinica", ph: "Ex: Clínica Saúde Total" },
            { label: "Especialidade", key: "especialidade", ph: "Ex: Fisioterapia, Estética" },
            { label: "Telefone", key: "telefone", ph: "(11) 99999-9999" },
            { label: "Endereço", key: "endereco", ph: "Rua, número, bairro" },
          ].map(({ label, key, ph }) => (
            <Field key={key} label={label}>
              <Input value={String(clinica[key as keyof typeof clinica])} onChange={(v) => setClinica({ ...clinica, [key]: v })} placeholder={ph} />
            </Field>
          ))}
          <Field label="Descrição (aparece na página de agendamento)">
            <textarea value={clinica.descricao} onChange={(e) => setClinica({ ...clinica, descricao: e.target.value })}
              rows={3} style={{ width: "100%", padding: "10px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", resize: "none", outline: "none", boxSizing: "border-box" }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <Field label="Duração (min)"><Input type="number" value={String(clinica.duracao_consulta)} onChange={(v) => setClinica({ ...clinica, duracao_consulta: Number(v) })} /></Field>
            <Field label="Intervalo (min)"><Input type="number" value={String(clinica.intervalo_entre)} onChange={(v) => setClinica({ ...clinica, intervalo_entre: Number(v) })} /></Field>
            <Field label="Dias à frente"><Input type="number" value={String(clinica.dias_antecedencia)} onChange={(v) => setClinica({ ...clinica, dias_antecedencia: Number(v) })} /></Field>
          </div>
          <SaveBar saving={saving} msg={savedMsg} onSave={saveClinica} />
        </div>
      )}

      {tab === "quiz" && (
        <div style={{ maxWidth: "580px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", color: "#9A9288" }}>{quiz.length} pergunta{quiz.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setQuiz([...quiz, { pergunta: "", tipo: "single_choice", opcoes: ["Opção A", "Opção B"], obrigatoria: true, ativo: true }])}
              style={{ padding: "7px 14px", background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "8px", color: ACCENT, cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus size={14} /> Nova pergunta
            </button>
          </div>
          {quiz.map((p, i) => (
            <div key={i} style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px", marginBottom: "10px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#777068" }}>#{i + 1}</span>
                <div style={{ flex: 1 }} />
                <label style={{ fontSize: "12px", color: p.ativo ? ACCENT : "#777068", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input type="checkbox" checked={p.ativo ?? true} onChange={(e) => setQuiz(quiz.map((q, j) => j === i ? { ...q, ativo: e.target.checked } : q))} style={{ accentColor: ACCENT }} /> Ativa
                </label>
                <button onClick={() => setQuiz(quiz.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#EF4444" }}><Trash2 size={14} /></button>
              </div>
              <Field label="Pergunta"><Input value={p.pergunta ?? ""} onChange={(v) => setQuiz(quiz.map((q, j) => j === i ? { ...q, pergunta: v } : q))} placeholder="Ex: Qual o motivo da consulta?" /></Field>
              <Field label="Tipo">
                <select value={p.tipo ?? "single_choice"} onChange={(e) => setQuiz(quiz.map((q, j) => j === i ? { ...q, tipo: e.target.value as CsQuizPergunta["tipo"] } : q))}
                  style={{ width: "100%", padding: "9px 14px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" }}>
                  <option value="single_choice">Múltipla escolha</option>
                  <option value="text">Texto livre</option>
                  <option value="boolean">Sim / Não</option>
                </select>
              </Field>
              {p.tipo === "single_choice" && (
                <Field label="Opções (uma por linha)">
                  <textarea value={(p.opcoes ?? []).join("\n")} onChange={(e) => setQuiz(quiz.map((q, j) => j === i ? { ...q, opcoes: e.target.value.split("\n").filter(Boolean) } : q))}
                    rows={3} style={{ width: "100%", padding: "10px 14px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", resize: "none", outline: "none", boxSizing: "border-box" }} />
                </Field>
              )}
            </div>
          ))}
          {quiz.length > 0 && <SaveBar saving={saving} msg={savedMsg} onSave={saveQuiz} />}
        </div>
      )}

      {tab === "horarios" && (
        <div style={{ maxWidth: "520px" }}>
          <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "16px" }}>Define os dias e faixas de horário. Os slots são gerados automaticamente com base na duração da consulta.</p>
          {[0,1,2,3,4,5,6].map((dia) => {
            const s = dispon.find((d) => d.dia_semana === dia) ?? { dia_semana: dia, hora_inicio: "09:00", hora_fim: "18:00", ativo: false };
            return (
              <div key={dia} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", marginBottom: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", minWidth: "100px" }}>
                  <input type="checkbox" checked={s.ativo ?? false} onChange={(e) => setDispon(dispon.map((d) => d.dia_semana === dia ? { ...d, ativo: e.target.checked } : d))} style={{ accentColor: ACCENT }} />
                  <span style={{ fontSize: "13px", fontWeight: "500", color: s.ativo ? "#fff" : "#555" }}>{DIAS_COMPLETOS[dia]}</span>
                </label>
                <div style={{ flex: 1, display: "flex", gap: "8px", alignItems: "center", opacity: s.ativo ? 1 : 0.3 }}>
                  <input type="time" value={s.hora_inicio ?? "09:00"} disabled={!s.ativo} onChange={(e) => setDispon(dispon.map((d) => d.dia_semana === dia ? { ...d, hora_inicio: e.target.value } : d))}
                    style={{ padding: "6px 10px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none" }} />
                  <span style={{ color: "#555", fontSize: "12px" }}>até</span>
                  <input type="time" value={s.hora_fim ?? "18:00"} disabled={!s.ativo} onChange={(e) => setDispon(dispon.map((d) => d.dia_semana === dia ? { ...d, hora_fim: e.target.value } : d))}
                    style={{ padding: "6px 10px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none" }} />
                </div>
              </div>
            );
          })}
          <SaveBar saving={saving} msg={savedMsg} onSave={saveDispon} />
        </div>
      )}

      {tab === "whatsapp" && (
        <div style={{ maxWidth: "520px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Status de conexão */}
          <div style={{ padding: "16px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: waStatus ? "14px" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: waStatus?.connected ? "#10B981" : "#EF4444", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: waStatus?.connected ? "#10B981" : "#9A9288", fontWeight: "500" }}>
                  {waStatus === null ? "Status desconhecido" : waStatus.connected ? `Conectado${waStatus.numero ? ` — ${waStatus.numero}` : ""}` : "Desconectado"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={verificarStatus} disabled={waCarregandoStatus}
                  style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#9A9288", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <RefreshCw size={11} style={{ animation: waCarregandoStatus ? "spin 1s linear infinite" : "none" }} /> Verificar
                </button>
                {!waStatus?.connected && (
                  <button onClick={conectarWhatsapp} disabled={waConectando || !waToken}
                    style={{ padding: "5px 12px", background: "rgba(0,207,255,0.1)", border: `1px solid rgba(0,207,255,0.3)`, borderRadius: "6px", color: ACCENT, cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                    {waConectando ? "Conectando..." : "Conectar"}
                  </button>
                )}
              </div>
            </div>

            {/* Erro */}
            {"error" in (waStatus ?? {}) && (
              <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "8px" }}>{String((waStatus as {error?: string}).error)}</p>
            )}

            {/* QR Code */}
            {waStatus?.qrcode && !waStatus.connected && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "#9A9288", marginBottom: "12px" }}>Escaneie com o WhatsApp para conectar</p>
                <img src={waStatus.qrcode} alt="QR Code WhatsApp" style={{ width: "200px", height: "200px", borderRadius: "8px", background: "#fff", padding: "8px" }} />
                <p style={{ fontSize: "11px", color: "#555", marginTop: "8px" }}>Após escanear, clique em Verificar</p>
              </div>
            )}
          </div>

          <Field label="URL da API">
            <Input value={waUrl} onChange={setWaUrl} placeholder="https://free.uazapi.com" />
          </Field>
          <Field label="Token (UUID da instância UazAPI)">
            <Input value={waToken} onChange={setWaToken} placeholder="Ex: 4643feee-780e-4e89-8e48-d4d71bf2fbdd" />
          </Field>
          <p style={{ fontSize: "11px", color: "#555", marginTop: "-6px" }}>O token é o UUID que aparece no painel da UazAPI — não o API Key.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em" }}>Notificações</p>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: waAtivo ? ACCENT : "#9A9288" }}>
              <input type="checkbox" checked={waAtivo} onChange={(e) => setWaAtivo(e.target.checked)} style={{ accentColor: ACCENT }} />
              Ativar envio automático
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: waNotifPaciente ? "#fff" : "#555" }}>
              <input type="checkbox" checked={waNotifPaciente} onChange={(e) => setWaNotifPaciente(e.target.checked)} style={{ accentColor: ACCENT }} />
              Notificar paciente ao agendar
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: waNotifClinica ? "#fff" : "#555" }}>
              <input type="checkbox" checked={waNotifClinica} onChange={(e) => setWaNotifClinica(e.target.checked)} style={{ accentColor: ACCENT }} />
              Notificar clínica ao agendar
            </label>
            {waNotifClinica && (
              <Field label="WhatsApp da clínica (com DDI, ex: 5511999999999)">
                <Input value={waTelClinica} onChange={setWaTelClinica} placeholder="5511999999999" />
              </Field>
            )}
          </div>

          <Field label="Mensagem para o paciente (opcional — deixe em branco para usar o padrão)">
            <textarea value={whatsappTemplate} onChange={(e) => setWhatsappTemplate(e.target.value)}
              rows={4} placeholder={"Olá {{nome}}! Seu agendamento está confirmado para {{data}} às {{hora}}. 🏥 {{clinica}}"}
              style={{ width: "100%", padding: "10px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Variáveis: {"{{nome}}"} {"{{data}}"} {"{{hora}}"} {"{{profissional}}"} {"{{procedimento}}"} {"{{clinica}}"} {"{{link}}"}</p>
          </Field>

          <SaveBar saving={saving} msg={savedMsg} onSave={saveWhatsapp} />

          {/* Teste */}
          <div style={{ marginTop: "8px", padding: "16px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Testar envio</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={waTeste} onChange={(e) => setWaTeste(e.target.value)} placeholder="5511999999999 (com DDI)"
                style={{ flex: 1, padding: "10px 14px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" }} />
              <button onClick={testarWhatsapp} disabled={waTestando || !waUrl || !waToken || !waInstance || !waTeste}
                style={{ padding: "10px 16px", background: waTestando ? "#1a1a1a" : "rgba(0,207,255,0.1)", border: `1px solid ${waTestando ? BORDER : "rgba(0,207,255,0.3)"}`, borderRadius: "8px", color: waTestando ? "#555" : ACCENT, cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                <Send size={13} /> {waTestando ? "Enviando..." : "Testar"}
              </button>
            </div>
            {waTesteMsg && (
              <p style={{ fontSize: "13px", marginTop: "10px", color: waTesteMsg.startsWith("✅") ? "#10B981" : "#EF4444" }}>{waTesteMsg}</p>
            )}
          </div>
        </div>
      )}

      {tab === "webhook" && (
        <div style={{ maxWidth: "520px" }}>
          <div style={{ background: "rgba(0,207,255,0.04)", border: `1px solid rgba(0,207,255,0.15)`, borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
            <p style={{ fontSize: "13px", color: ACCENT, fontWeight: "600", marginBottom: "6px" }}>Integração com n8n</p>
            <p style={{ fontSize: "13px", color: "#9A9288", lineHeight: 1.6 }}>
              Configure o n8n para escutar <code style={{ color: ACCENT }}>GET /api/webhooks</code> e disparar WhatsApp automático para confirmações, lembretes e remarketing.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Field label="URL do webhook (n8n)">
              <Input value={webhookUrl} onChange={setWebhookUrl} placeholder="https://seu-n8n.com/webhook/clinica" />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: webhookAtivo ? ACCENT : "#9A9288" }}>
              <input type="checkbox" checked={webhookAtivo} onChange={(e) => setWebhookAtivo(e.target.checked)} style={{ accentColor: ACCENT }} />
              Ativar disparo automático
            </label>
            <Field label="Mensagem WhatsApp (template para o n8n)">
              <textarea value={whatsappTemplate} onChange={(e) => setWhatsappTemplate(e.target.value)}
                rows={4} placeholder={"Olá {{nome}}, sua consulta está confirmada para {{data}} às {{hora}}. Clínica XYZ."}
                style={{ width: "100%", padding: "10px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Variáveis: {"{{nome}}"}, {"{{data}}"}, {"{{hora}}"}, {"{{profissional}}"}, {"{{procedimento}}"}</p>
            </Field>
          </div>
          <div style={{ marginTop: "20px" }}>
            <SaveBar saving={saving} msg={savedMsg} onSave={saveWebhook} />
          </div>

          {/* Log de eventos */}
          <div style={{ marginTop: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>Eventos recentes</p>
              <button onClick={carregarEventos} disabled={loadingEventos}
                style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#9A9288", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                <RefreshCw size={11} style={{ animation: loadingEventos ? "spin 1s linear infinite" : "none" }} /> Atualizar
              </button>
            </div>
            {eventos.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#555" }}>Nenhum evento registrado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {eventos.map((ev) => {
                  const cor = ev.status === "enviado" ? "#10B981" : ev.status === "erro" ? "#EF4444" : "#F59E0B";
                  return (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: cor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "12px", color: "#ccc", fontWeight: "500" }}>{ev.tipo}</p>
                        <p style={{ fontSize: "11px", color: "#555" }}>{new Date(ev.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: `${cor}15`, color: cor, border: `1px solid ${cor}30` }}>{ev.status}</span>
                      {ev.status === "erro" && (
                        <button onClick={() => reprocessar(ev.id)} disabled={reprocessando === ev.id}
                          style={{ padding: "4px 8px", background: "transparent", border: `1px solid rgba(239,68,68,0.3)`, borderRadius: "5px", color: "#EF4444", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <RotateCcw size={10} /> {reprocessando === ev.id ? "..." : "Retentar"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "6px" }}>{label}</label>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", padding: "10px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />;
}

function SaveBar({ saving, msg, onSave }: { saving: boolean; msg: string; onSave: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
      <button disabled={saving} onClick={onSave} style={{ padding: "10px 22px", background: ACCENT, border: "none", borderRadius: "8px", color: "#000", fontSize: "13px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: saving ? 0.7 : 1 }}>
        <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
      </button>
      {msg && <span style={{ fontSize: "13px", color: "#10B981" }}>{msg}</span>}
    </div>
  );
}
