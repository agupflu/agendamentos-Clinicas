"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, Phone } from "lucide-react";
import type { CsAgendamento, CsBloqueio, CsConfig, CsDisponibilidade, CsProfissional } from "@/types";
import { semanaAtual, toISO, DIAS_NOMES, gerarSlots, somarMinutos, STATUS_COLORS, STATUS_LABELS, formatarDataExtenso } from "@/lib/calendario";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.07)";
const HORA_INICIO = 7;
const HORA_FIM = 21;
const SLOT_MIN = 30;
const CELL_H = 56;

interface Props {
  config: CsConfig | null;
  disponibilidade: CsDisponibilidade[];
  bloqueios: CsBloqueio[];
  agendamentos: CsAgendamento[];
  profissionais: CsProfissional[];
  bloqueiosProfissionais: (CsBloqueio & { profissional_id: string })[];
}

export default function CalendarioView({ config, disponibilidade, bloqueios: initBloqueios, agendamentos: initAgendamentos, profissionais, bloqueiosProfissionais }: Props) {
  const [semanaRef, setSemanaRef] = useState(new Date());
  const [bloqueios, setBloqueios] = useState(initBloqueios);
  const [agendamentos, setAgendamentos] = useState(initAgendamentos);
  const [profissionalFiltro, setProfissionalFiltro] = useState<string>("");
  const [modalBloqueio, setModalBloqueio] = useState<{ data: string; hora: string } | null>(null);
  const [modalAg, setModalAg] = useState<CsAgendamento | null>(null);
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const [deletandoAg, setDeletandoAg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState("");
  const [editProfId, setEditProfId] = useState("");
  const [editHora, setEditHora] = useState("");
  const [editHoras, setEditHoras] = useState<string[]>([]);
  const [editLoadingH, setEditLoadingH] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(() => {
    if (!editData || !editProfId) { setEditHoras([]); return; }
    setEditLoadingH(true);
    setEditHora("");
    fetch(`/api/disponibilidade?data=${editData}&profissional_id=${editProfId}`)
      .then((r) => r.json())
      .then((d) => setEditHoras(d.horarios ?? []))
      .catch(() => {})
      .finally(() => setEditLoadingH(false));
  }, [editData, editProfId]);

  const semana = semanaAtual(semanaRef);
  const duracao = config?.duracao_consulta ?? 30;

  // Disponibilidade e bloqueios efetivos conforme filtro de profissional
  const profSel = profissionais.find((p) => p.id === profissionalFiltro) ?? null;
  const dispAtiva: { dia_semana: number; hora_inicio: string; hora_fim: string; ativo: boolean }[] =
    profSel
      ? (profSel.disponibilidade ?? [])
      : profissionais.length > 0
        ? profissionais.flatMap((p) => p.disponibilidade ?? [])
        : disponibilidade;
  const bloqueiosAtivos: CsBloqueio[] = profissionalFiltro
    ? bloqueiosProfissionais.filter((b) => b.profissional_id === profissionalFiltro)
    : bloqueios;
  const agsFiltrados = profissionalFiltro
    ? agendamentos.filter((a) => a.profissional_id === profissionalFiltro)
    : agendamentos;

  const horasLinha = Array.from({ length: (HORA_FIM - HORA_INICIO) * (60 / SLOT_MIN) }, (_, i) => {
    const totalMin = HORA_INICIO * 60 + i * SLOT_MIN;
    return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  });

  function navSemana(dir: number) {
    const d = new Date(semanaRef);
    d.setDate(d.getDate() + dir * 7);
    setSemanaRef(d);
  }

  function isDiaBloqueado(iso: string) {
    return bloqueiosAtivos.some((b) => b.data === iso && !b.hora_inicio);
  }

  function isHoraBloqueada(iso: string, hora: string) {
    return bloqueiosAtivos.some((b) => {
      if (b.data !== iso) return false;
      if (!b.hora_inicio) return true;
      return hora >= b.hora_inicio && hora < (b.hora_fim ?? "23:59");
    });
  }

  function isDiaAtivo(diaSemana: number) {
    return dispAtiva.some((d) => d.dia_semana === diaSemana && d.ativo);
  }

  function isHoraNoDisponivel(diaSemana: number, hora: string) {
    const ranges = dispAtiva.filter((d) => d.dia_semana === diaSemana && d.ativo);
    return ranges.some((d) => hora >= d.hora_inicio && hora < d.hora_fim);
  }

  function agendamentosNaHora(iso: string, hora: string) {
    return agsFiltrados.filter((a) => a.data === iso && a.hora === hora && a.status !== "cancelado");
  }

  async function bloquearHora() {
    if (!modalBloqueio) return;
    setSalvandoBloqueio(true);
    try {
      const endpoint = profissionalFiltro ? "/api/bloqueios?tipo=profissional" : "/api/bloqueios";
      const body: Record<string, unknown> = {
        data: modalBloqueio.data,
        hora_inicio: modalBloqueio.hora,
        hora_fim: somarMinutos(modalBloqueio.hora, SLOT_MIN),
        motivo: motivoBloqueio || null,
      };
      if (profissionalFiltro) body.profissional_id = profissionalFiltro;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const novo = await r.json();
        if (profissionalFiltro) {
          // bloqueiosProfissionais é prop imutável — não atualiza estado local, refresh simples
          window.location.reload();
        } else {
          setBloqueios((prev) => [...prev, novo]);
        }
        setModalBloqueio(null);
        setMotivoBloqueio("");
      }
    } finally { setSalvandoBloqueio(false); }
  }

  async function desbloquearHora(data: string, hora: string) {
    const bloqueio = bloqueiosAtivos.find((b) => b.data === data && b.hora_inicio === hora);
    if (!bloqueio) return;
    const endpoint = profissionalFiltro ? "/api/bloqueios?tipo=profissional" : "/api/bloqueios";
    await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bloqueio.id }),
    });
    if (profissionalFiltro) {
      window.location.reload();
    } else {
      setBloqueios((prev) => prev.filter((b) => b.id !== bloqueio.id));
    }
  }

  async function updateStatusAg(id: string, status: string) {
    const r = await fetch(`/api/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      const updated = await r.json();
      setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, ...updated } : a));
      setModalAg((prev) => prev ? { ...prev, status: updated.status } : null);
    }
  }

  function abrirEdicao(ag: CsAgendamento) {
    setEditData(ag.data);
    setEditProfId((ag.profissional as any)?.id ?? ag.profissional_id ?? "");
    setEditHora(ag.hora);
    setEditMode(true);
  }

  async function salvarEdicao(id: string) {
    if (!editData || !editHora) return;
    setSalvandoEdicao(true);
    try {
      const body: Record<string, unknown> = { data: editData, hora: editHora };
      if (editProfId) body.profissional_id = editProfId;
      const r = await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const updated = await r.json();
        setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, ...updated } : a));
        setModalAg((prev) => prev ? { ...prev, data: editData, hora: editHora } : null);
        setEditMode(false);
      }
    } finally { setSalvandoEdicao(false); }
  }

  async function excluirAgendamento(id: string) {
    setDeletandoAg(true);
    try {
      const r = await fetch(`/api/agendamentos/${id}`, { method: "DELETE" });
      if (r.ok) {
        setAgendamentos((prev) => prev.filter((a) => a.id !== id));
        setModalAg(null);
        setConfirmDelete(false);
      }
    } finally { setDeletandoAg(false); }
  }

  const hoje = toISO(new Date());

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>Calendário</h1>
        {profissionais.length > 0 && (
          <select value={profissionalFiltro} onChange={(e) => setProfissionalFiltro(e.target.value)}
            style={{ padding: "5px 10px", background: profissionalFiltro ? "rgba(0,207,255,0.08)" : "#111", border: `1px solid ${profissionalFiltro ? "rgba(0,207,255,0.3)" : BORDER}`, borderRadius: "6px", color: profissionalFiltro ? ACCENT : "#9A9288", fontSize: "12px", cursor: "pointer", outline: "none" }}>
            <option value="">Todos os profissionais</option>
            {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setSemanaRef(new Date())}
          style={{ padding: "6px 14px", background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "6px", color: ACCENT, fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
          Hoje
        </button>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={() => navSemana(-1)} style={{ width: "30px", height: "30px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9A9288" }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navSemana(1)} style={{ width: "30px", height: "30px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9A9288" }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <span style={{ fontSize: "13px", color: "#9A9288", minWidth: "180px", textAlign: "right" }}>
          {semana[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – {semana[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Cabeçalho dias */}
        <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", borderBottom: `1px solid ${BORDER}`, flexShrink: 0, position: "sticky", top: 0, background: "#080808", zIndex: 10 }}>
          <div />
          {semana.map((d) => {
            const iso = toISO(d);
            const isHoje = iso === hoje;
            const ativo = isDiaAtivo(d.getDay());
            return (
              <div key={iso} style={{ padding: "10px 8px", textAlign: "center", borderLeft: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: "10px", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em" }}>{DIAS_NOMES[d.getDay()]}</p>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: isHoje ? ACCENT : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 2px" }}>
                  <p style={{ fontSize: "15px", fontWeight: "700", color: isHoje ? "#000" : ativo ? "#fff" : "#444" }}>{d.getDate()}</p>
                </div>
                {!ativo && <p style={{ fontSize: "9px", color: "#444" }}>fechado</p>}
              </div>
            );
          })}
        </div>

        {/* Linhas de hora */}
        <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", flex: 1 }}>
          {/* Coluna horas */}
          <div>
            {horasLinha.map((h) => (
              <div key={h} style={{ height: `${CELL_H}px`, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: "8px", paddingTop: "4px" }}>
                {h.endsWith(":00") && <span style={{ fontSize: "10px", color: "#555" }}>{h}</span>}
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {semana.map((d) => {
            const iso = toISO(d);
            const ativo = isDiaAtivo(d.getDay());
            return (
              <div key={iso} style={{ borderLeft: `1px solid ${BORDER}`, position: "relative" }}>
                {horasLinha.map((hora) => {
                  const ags = agendamentosNaHora(iso, hora);
                  const bloqueada = isHoraBloqueada(iso, hora);
                  const disponivel = isHoraNoDisponivel(d.getDay(), hora);
                  const isSlotDuracao = hora.endsWith(`:00`) || hora.endsWith(`:30`);

                  return (
                    <div key={hora}
                      style={{ height: `${CELL_H}px`, borderBottom: `1px solid ${hora.endsWith(":00") ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)"}`, position: "relative", background: !ativo ? "rgba(255,255,255,0.01)" : bloqueada ? "rgba(239,68,68,0.04)" : disponivel ? "transparent" : "rgba(255,255,255,0.01)" }}
                      onClick={() => {
                        if (!ativo || !disponivel || ags.length > 0) return;
                        if (bloqueada) { desbloquearHora(iso, hora); return; }
                        setModalBloqueio({ data: iso, hora });
                      }}>

                      {/* Agendamento */}
                      {ags.map((ag) => (
                        <div key={ag.id}
                          onClick={(e) => { e.stopPropagation(); setModalAg(ag); }}
                          style={{ position: "absolute", top: "2px", left: "2px", right: "2px", background: `${STATUS_COLORS[ag.status]}22`, border: `1px solid ${STATUS_COLORS[ag.status]}55`, borderRadius: "5px", padding: "3px 6px", cursor: "pointer", zIndex: 2, minHeight: "20px" }}>
                          <p style={{ fontSize: "11px", fontWeight: "600", color: STATUS_COLORS[ag.status], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ag.paciente?.nome ?? "Paciente"}
                          </p>
                          <p style={{ fontSize: "10px", color: "#9A9288", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ag.hora}{!profissionalFiltro && ag.profissional?.nome ? ` · ${(ag.profissional as any).nome}` : ""}
                          </p>
                        </div>
                      ))}

                      {/* Bloqueio */}
                      {bloqueada && ags.length === 0 && (
                        <div style={{ position: "absolute", inset: "1px", background: "rgba(239,68,68,0.08)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "9px", color: "#EF444466" }}>bloqueado</span>
                        </div>
                      )}

                      {/* Hover indicator para slots disponíveis */}
                      {ativo && disponivel && !bloqueada && ags.length === 0 && isSlotDuracao && (
                        <div className="slot-hover" style={{ position: "absolute", inset: "1px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", cursor: "pointer" }}>
                          <Plus size={12} color="#555" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`.slot-hover:hover { opacity: 1 !important; background: rgba(255,255,255,0.03) !important; }`}</style>

      {/* Modal Bloqueio */}
      {modalBloqueio && (
        <Modal onClose={() => setModalBloqueio(null)} title="Bloquear horário">
          <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "16px" }}>
            {formatarDataExtenso(modalBloqueio.data)} às <strong style={{ color: "#fff" }}>{modalBloqueio.hora}</strong>
          </p>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "6px" }}>Motivo (opcional)</label>
            <input value={motivoBloqueio} onChange={(e) => setMotivoBloqueio(e.target.value)}
              placeholder="Ex: Reunião, pausa..."
              style={{ width: "100%", padding: "10px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setModalBloqueio(null)}
              style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", fontSize: "13px" }}>
              Cancelar
            </button>
            <button onClick={bloquearHora} disabled={salvandoBloqueio}
              style={{ flex: 2, padding: "10px", background: "#EF4444", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
              {salvandoBloqueio ? "Bloqueando..." : "Bloquear horário"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Agendamento */}
      {modalAg && (
        <Modal onClose={() => { setModalAg(null); setConfirmDelete(false); setEditMode(false); }} title="Agendamento">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <InfoRow icon={<User size={14} />} label="Paciente" value={modalAg.paciente?.nome ?? "—"} />
            <InfoRow icon={<Phone size={14} />} label="WhatsApp" value={modalAg.paciente?.telefone ?? "—"} />
            <InfoRow icon={<Clock size={14} />} label="Horário" value={`${modalAg.data.split("-").reverse().join("/")} às ${modalAg.hora}`} />
            <div>
              <p style={{ fontSize: "11px", color: "#777068", marginBottom: "4px" }}>Status</p>
              <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "99px", background: `${STATUS_COLORS[modalAg.status]}18`, color: STATUS_COLORS[modalAg.status], border: `1px solid ${STATUS_COLORS[modalAg.status]}30` }}>
                {STATUS_LABELS[modalAg.status]}
              </span>
            </div>
            {modalAg.quiz_respostas && Object.keys(modalAg.quiz_respostas).length > 0 && (
              <div>
                <p style={{ fontSize: "11px", color: "#777068", marginBottom: "8px" }}>Respostas do quiz</p>
                {Object.entries(modalAg.quiz_respostas).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: "6px" }}>
                    <p style={{ fontSize: "11px", color: "#555" }}>{k}</p>
                    <p style={{ fontSize: "12px", color: "#ccc" }}>{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            {(["confirmado", "concluido", "cancelado", "no_show"] as const).map((s) => (
              <button key={s} onClick={() => updateStatusAg(modalAg.id, s)}
                style={{ padding: "7px 12px", background: modalAg.status === s ? `${STATUS_COLORS[s]}22` : "transparent", border: `1px solid ${modalAg.status === s ? STATUS_COLORS[s] : BORDER}`, borderRadius: "6px", color: modalAg.status === s ? STATUS_COLORS[s] : "#9A9288", cursor: "pointer", fontSize: "12px" }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {/* Reagendar */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "12px", marginBottom: "10px" }}>
            {!editMode ? (
              <button onClick={() => abrirEdicao(modalAg)}
                style={{ width: "100%", padding: "8px", background: "transparent", border: `1px solid rgba(0,207,255,0.25)`, borderRadius: "6px", color: ACCENT, cursor: "pointer", fontSize: "12px" }}>
                Reagendar
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "12px", fontWeight: "600", color: ACCENT }}>Reagendar</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#777068", display: "block", marginBottom: "4px" }}>Data</label>
                    <input type="date" value={editData} onChange={(e) => setEditData(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#fff", fontSize: "12px", outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#777068", display: "block", marginBottom: "4px" }}>Horário</label>
                    <select value={editHora} onChange={(e) => setEditHora(e.target.value)}
                      disabled={!editData || editLoadingH}
                      style={{ width: "100%", padding: "8px 10px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "6px", color: editHora ? "#fff" : "#555", fontSize: "12px", outline: "none", cursor: "pointer" }}>
                      <option value="">{editLoadingH ? "Carregando..." : "Horário..."}</option>
                      {editHoras.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                {profissionais.length > 0 && (
                  <div>
                    <label style={{ fontSize: "11px", color: "#777068", display: "block", marginBottom: "4px" }}>Profissional</label>
                    <select value={editProfId} onChange={(e) => setEditProfId(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer" }}>
                      {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setEditMode(false)}
                    style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#9A9288", cursor: "pointer", fontSize: "12px" }}>
                    Cancelar
                  </button>
                  <button onClick={() => salvarEdicao(modalAg.id)} disabled={salvandoEdicao || !editData || !editHora}
                    style={{ flex: 1, padding: "8px", background: ACCENT, border: "none", borderRadius: "6px", color: "#000", cursor: "pointer", fontSize: "12px", fontWeight: "600", opacity: (!editData || !editHora) ? 0.5 : 1 }}>
                    {salvandoEdicao ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "12px" }}>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                style={{ width: "100%", padding: "8px", background: "transparent", border: `1px solid rgba(239,68,68,0.3)`, borderRadius: "6px", color: "#EF4444", cursor: "pointer", fontSize: "12px" }}>
                Excluir agendamento
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#9A9288", cursor: "pointer", fontSize: "12px" }}>
                  Cancelar
                </button>
                <button onClick={() => excluirAgendamento(modalAg.id)} disabled={deletandoAg}
                  style={{ flex: 1, padding: "8px", background: "#EF4444", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                  {deletandoAg ? "Excluindo..." : "Confirmar exclusão"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}
      onClick={onClose}>
      <div style={{ background: "#111", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "400px" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#777068" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ color: ACCENT }}>{icon}</div>
      <div>
        <p style={{ fontSize: "11px", color: "#777068" }}>{label}</p>
        <p style={{ fontSize: "13px", color: "#fff", fontWeight: "500" }}>{value}</p>
      </div>
    </div>
  );
}
