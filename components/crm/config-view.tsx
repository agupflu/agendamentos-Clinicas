"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Building2, Zap, Clock, Link2, RefreshCw, RotateCcw } from "lucide-react";
import type { CsConfig, CsQuizPergunta, CsDisponibilidade } from "@/types";
import { DIAS_COMPLETOS } from "@/lib/calendario";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";
type Tab = "clinica" | "quiz" | "horarios" | "webhook";

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

  const TABS = [
    { key: "clinica" as Tab, label: "Clínica", icon: <Building2 size={13} /> },
    { key: "quiz" as Tab, label: "Quiz", icon: <Zap size={13} /> },
    { key: "horarios" as Tab, label: "Horários", icon: <Clock size={13} /> },
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
