"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, Phone, ChevronDown, RefreshCw, ExternalLink, Stethoscope, Plus, X, Link2, Check } from "lucide-react";
import Link from "next/link";
import type { CsAgendamento, CsAgendamentoStatus } from "@/types";
import { formatarData, STATUS_LABELS, STATUS_COLORS } from "@/lib/calendario";

const TIPO_LABELS: Record<string, string> = { avaliacao: "Avaliação", retorno: "Retorno" };

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";
const STATUS_LIST: CsAgendamentoStatus[] = ["pendente", "confirmado", "cancelado", "concluido", "no_show"];

interface ProfItem { id: string; nome: string; especialidade: string; }
interface ProcItem { id: string; nome: string; categoria: string; }
const TIPO_OPTS = [{ val: "avaliacao", label: "Avaliação" }, { val: "retorno", label: "Retorno" }] as const;

export default function AgendamentosCrm({ initialData }: { initialData: CsAgendamento[] }) {
  const [lista, setLista] = useState(initialData);
  const [filtro, setFiltro] = useState<CsAgendamentoStatus | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  // Modal novo agendamento
  const [modalNovo, setModalNovo] = useState(false);
  const [profList, setProfList] = useState<ProfItem[]>([]);
  const [procList, setProcList] = useState<ProcItem[]>([]);
  const [horasList, setHorasList] = useState<string[]>([]);
  const [loadingHoras, setLoadingHoras] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroNovo, setErroNovo] = useState("");
  const [form, setForm] = useState({ telefone: "", nome: "", profissional_id: "", procedimento_id: "", tipo: "" as "avaliacao" | "retorno" | "", data: "", hora: "" });

  useEffect(() => { setPagina(1); }, [filtro, busca]);

  useEffect(() => {
    if (!form.data || !form.profissional_id) { setHorasList([]); return; }
    setLoadingHoras(true);
    setForm((p) => ({ ...p, hora: "" }));
    fetch(`/api/disponibilidade?data=${form.data}&profissional_id=${form.profissional_id}`)
      .then((r) => r.json())
      .then((d) => setHorasList(d.horarios ?? []))
      .catch(() => {})
      .finally(() => setLoadingHoras(false));
  }, [form.data, form.profissional_id]);

  async function abrirModal() {
    setForm({ telefone: "", nome: "", profissional_id: "", procedimento_id: "", tipo: "", data: "", hora: "" });
    setErroNovo("");
    setHorasList([]);
    setModalNovo(true);
    const [rProf, rProc] = await Promise.all([
      fetch("/api/profissionais").then((r) => r.json()),
      fetch("/api/procedimentos").then((r) => r.json()),
    ]);
    setProfList(Array.isArray(rProf) ? rProf : []);
    setProcList(Array.isArray(rProc) ? rProc : []);
  }

  function setField(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    if (key === "telefone" && value.replace(/\D/g, "").length >= 8) {
      buscarPaciente(value);
    }
  }

  async function buscarPaciente(tel: string) {
    try {
      const r = await fetch(`/api/pacientes?telefone=${encodeURIComponent(tel)}`);
      if (!r.ok) return;
      const lista = await r.json();
      if (lista.length > 0) {
        setForm((p) => ({ ...p, nome: p.nome || lista[0].nome }));
      }
    } catch { /* ignore */ }
  }

  async function criarAgendamento() {
    if (!form.telefone || !form.nome || !form.profissional_id || !form.data || !form.hora) {
      setErroNovo("Preencha todos os campos obrigatórios (*).");
      return;
    }
    setSalvando(true);
    setErroNovo("");
    try {
      const proc = procList.find((p) => p.id === form.procedimento_id);
      const r = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente: { nome: form.nome, telefone: form.telefone },
          data: form.data,
          hora: form.hora,
          profissional_id: form.profissional_id,
          tipo_agendamento: form.tipo || undefined,
          procedimento_id: form.procedimento_id || undefined,
          procedimento: proc?.nome,
          quiz_respostas: {},
          origem: "manual",
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErroNovo(d.error ?? "Erro ao criar."); return; }
      setModalNovo(false);
      await refresh();
    } finally { setSalvando(false); }
  }

  const hoje = new Date().toISOString().split("T")[0];
  const stats = {
    total: lista.length,
    hoje: lista.filter((a) => a.data === hoje).length,
    pendentes: lista.filter((a) => a.status === "pendente").length,
    confirmados: lista.filter((a) => a.status === "confirmado").length,
  };

  const filtrados = lista
    .filter((a) => filtro === "todos" || a.status === filtro)
    .filter((a) => !busca || a.paciente?.nome?.toLowerCase().includes(busca.toLowerCase()) || a.paciente?.telefone?.includes(busca));

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/agendamentos");
      if (r.ok) setLista(await r.json());
    } finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: CsAgendamentoStatus) {
    setAtualizando(id);
    try {
      const r = await fetch(`/api/agendamentos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (r.ok) {
        const upd = await r.json();
        setLista((prev) => prev.map((a) => a.id === id ? { ...a, ...upd } : a));
      }
    } finally { setAtualizando(null); }
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "10px", marginBottom: "24px" }}>
        {[["Total", stats.total, "#fff"], ["Hoje", stats.hoje, ACCENT], ["Pendentes", stats.pendentes, "#F59E0B"], ["Confirmados", stats.confirmados, "#10B981"]].map(([l, v, c]) => (
          <div key={String(l)} style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px" }}>
            <p style={{ fontSize: "11px", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{l}</p>
            <p style={{ fontSize: "26px", fontWeight: "700", color: String(c) }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente..."
          style={{ flex: 1, minWidth: "180px", padding: "8px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" }} />
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {(["todos", ...STATUS_LIST] as const).map((s) => (
            <button key={s} onClick={() => setFiltro(s)}
              style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: `1px solid ${filtro === s ? (s === "todos" ? ACCENT : STATUS_COLORS[s] ?? ACCENT) : BORDER}`, background: filtro === s ? (s === "todos" ? "rgba(0,207,255,0.1)" : `${STATUS_COLORS[s]}18`) : "transparent", color: filtro === s ? (s === "todos" ? ACCENT : STATUS_COLORS[s] ?? ACCENT) : "#9A9288" }}>
              {s === "todos" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button onClick={refresh} disabled={loading} style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
          <RefreshCw size={13} /> Atualizar
        </button>
        <button onClick={abrirModal} style={{ padding: "8px 14px", background: ACCENT, border: "none", borderRadius: "8px", color: "#000", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700" }}>
          <Plus size={14} /> Novo
        </button>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#777068" }}>
          <Calendar size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
          <p>Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {paginados.map((ag) => <AgCard key={ag.id} ag={ag} onStatus={updateStatus} loading={atualizando === ag.id} />)}
        </div>
      )}

      {/* Paginação */}
      {filtrados.length > POR_PAGINA && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "20px" }}>
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${pagina === 1 ? BORDER : ACCENT}`, borderRadius: "8px", color: pagina === 1 ? "#9A9288" : ACCENT, fontSize: "13px", cursor: pagina === 1 ? "not-allowed" : "pointer", opacity: pagina === 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ fontSize: "13px", color: "#9A9288" }}>
            Página <span style={{ color: "#fff", fontWeight: "600" }}>{pagina}</span> de <span style={{ color: "#fff", fontWeight: "600" }}>{totalPaginas}</span>
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${pagina === totalPaginas ? BORDER : ACCENT}`, borderRadius: "8px", color: pagina === totalPaginas ? "#9A9288" : ACCENT, fontSize: "13px", cursor: pagina === totalPaginas ? "not-allowed" : "pointer", opacity: pagina === totalPaginas ? 0.5 : 1 }}>
            Próximo
          </button>
        </div>
      )}
      {/* Modal novo agendamento */}
      {modalNovo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}
          onClick={() => setModalNovo(false)}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>Novo agendamento</h3>
              <button onClick={() => setModalNovo(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#777068" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Paciente */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>WhatsApp *</label>
                  <input value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} placeholder="(11) 99999-9999"
                    style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Nome do paciente *</label>
                  <input value={form.nome} onChange={(e) => setField("nome", e.target.value)} placeholder="Nome completo"
                    style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Profissional */}
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Profissional *</label>
                <select value={form.profissional_id} onChange={(e) => setField("profissional_id", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "8px", color: form.profissional_id ? "#fff" : "#555", fontSize: "13px", outline: "none", cursor: "pointer" }}>
                  <option value="">Selecionar profissional...</option>
                  {profList.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.especialidade}</option>)}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "8px" }}>Tipo de consulta</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {TIPO_OPTS.map((t) => (
                    <button key={t.val} onClick={() => setField("tipo", form.tipo === t.val ? "" : t.val)}
                      style={{ flex: 1, padding: "9px", background: form.tipo === t.val ? "rgba(0,207,255,0.1)" : "transparent", border: `1px solid ${form.tipo === t.val ? "rgba(0,207,255,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", color: form.tipo === t.val ? ACCENT : "#9A9288", fontSize: "13px", cursor: "pointer", fontWeight: form.tipo === t.val ? "600" : "400" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Procedimento */}
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Procedimento</label>
                <select value={form.procedimento_id} onChange={(e) => setField("procedimento_id", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "8px", color: form.procedimento_id ? "#fff" : "#555", fontSize: "13px", outline: "none", cursor: "pointer" }}>
                  <option value="">Sem procedimento</option>
                  {procList
                    .filter((p) => !form.tipo || ["ambos", form.tipo].includes(p.categoria))
                    .map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {/* Data e Hora */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Data *</label>
                  <input type="date" value={form.data} onChange={(e) => setField("data", e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "8px", color: form.data ? "#fff" : "#555", fontSize: "13px", outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Horário *</label>
                  <select value={form.hora} onChange={(e) => setField("hora", e.target.value)}
                    disabled={!form.data || !form.profissional_id || loadingHoras}
                    style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "8px", color: form.hora ? "#fff" : "#555", fontSize: "13px", outline: "none", cursor: (!form.data || !form.profissional_id) ? "not-allowed" : "pointer", opacity: (!form.data || !form.profissional_id) ? 0.5 : 1 }}>
                    <option value="">{loadingHoras ? "Carregando..." : !form.data || !form.profissional_id ? "Selecione data e profissional" : horasList.length === 0 ? "Sem horários disponíveis" : "Selecionar horário..."}</option>
                    {horasList.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {erroNovo && (
                <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", color: "#EF4444", fontSize: "13px" }}>
                  {erroNovo}
                </div>
              )}

              <button onClick={criarAgendamento} disabled={salvando}
                style={{ width: "100%", padding: "13px", background: salvando ? "#1a1a1a" : ACCENT, border: "none", borderRadius: "10px", color: salvando ? "#444" : "#000", fontSize: "14px", fontWeight: "700", cursor: salvando ? "not-allowed" : "pointer", marginTop: "4px" }}>
                {salvando ? "Criando..." : "Criar agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgCard({ ag, onStatus, loading }: { ag: CsAgendamento; onStatus: (id: string, s: CsAgendamentoStatus) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const cor = STATUS_COLORS[ag.status] ?? "#777";

  function copiarLink() {
    const url = `${window.location.origin}/agendar/reagendar/${ag.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div style={{ width: "3px", height: "40px", background: cor, borderRadius: "99px", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{ag.paciente?.nome ?? "—"}</span>
            <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "99px", background: `${cor}18`, color: cor, border: `1px solid ${cor}30` }}>{STATUS_LABELS[ag.status]}</span>
            {ag.tipo_agendamento && (
              <span style={{ fontSize: "10px", color: "#9A9288", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, padding: "1px 6px", borderRadius: "99px" }}>
                {TIPO_LABELS[ag.tipo_agendamento] ?? ag.tipo_agendamento}
              </span>
            )}
            {ag.origem === "manual" && <span style={{ fontSize: "10px", color: "#777068", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, padding: "1px 6px", borderRadius: "99px" }}>manual</span>}
          </div>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={11} />{formatarData(ag.data)}</span>
            <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={11} />{ag.hora}</span>
            {ag.profissional?.nome && (
              <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}><Stethoscope size={11} />{ag.profissional.nome}</span>
            )}
            {ag.procedimento && (
              <span style={{ fontSize: "12px", color: "#777068", display: "flex", alignItems: "center", gap: "4px" }}>{ag.procedimento}</span>
            )}
            {ag.paciente?.telefone && <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}><Phone size={11} />{ag.paciente.telefone}</span>}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <button disabled={loading} onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            style={{ padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#9A9288", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
            {loading ? "..." : <><User size={11} /> Status <ChevronDown size={11} /></>}
          </button>
          {menu && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: "8px", zIndex: 50, minWidth: "150px", overflow: "hidden" }} onMouseLeave={() => setMenu(false)}>
              {(["pendente", "confirmado", "concluido", "cancelado", "no_show"] as CsAgendamentoStatus[]).map((s) => (
                <button key={s} onClick={(e) => { e.stopPropagation(); onStatus(ag.id, s); setMenu(false); }}
                  style={{ display: "block", width: "100%", padding: "9px 14px", background: ag.status === s ? `${STATUS_COLORS[s]}15` : "transparent", border: "none", color: ag.status === s ? STATUS_COLORS[s] : "#ccc", fontSize: "13px", textAlign: "left", cursor: "pointer" }}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
        <ChevronDown size={15} color="#555" style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px", background: "#0d0d0d" }}>
          {ag.quiz_respostas && Object.keys(ag.quiz_respostas).length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "11px", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Quiz</p>
              {Object.entries(ag.quiz_respostas).map(([k, v]) => (
                <div key={k} style={{ marginBottom: "6px" }}>
                  <p style={{ fontSize: "11px", color: "#555" }}>{k}</p>
                  <p style={{ fontSize: "12px", color: "#ccc" }}>{v}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {ag.paciente && (
              <Link href={`/pacientes?id=${ag.paciente.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: ACCENT, textDecoration: "none" }}>
                <ExternalLink size={12} /> Ver perfil do paciente
              </Link>
            )}
            <button onClick={copiarLink}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: copiado ? "#10B981" : "#9A9288", background: "transparent", border: `1px solid ${copiado ? "rgba(16,185,129,0.3)" : BORDER}`, borderRadius: "6px", padding: "4px 10px", cursor: "pointer", transition: "color 0.2s, border-color 0.2s" }}>
              {copiado ? <><Check size={12} /> Link copiado!</> : <><Link2 size={12} /> Copiar link de reagendamento</>}
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#444", marginTop: "10px" }}>Criado em {new Date(ag.created_at).toLocaleString("pt-BR")}</p>
        </div>
      )}
    </div>
  );
}
