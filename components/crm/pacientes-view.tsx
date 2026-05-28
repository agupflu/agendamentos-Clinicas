"use client";

import { useState, useEffect, useRef } from "react";
import { User, Phone, Mail, Plus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import type { CsPaciente } from "@/types";
import { formatarData, STATUS_LABELS, STATUS_COLORS } from "@/lib/calendario";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";

export default function PacientesView({ initialData, initialTotal }: { initialData: CsPaciente[]; initialTotal: number }) {
  const [pacientes, setPacientes] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const [selecionado, setSelecionado] = useState<CsPaciente | null>(null);
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchPacientes(q: string, p: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("busca", q);
      const r = await fetch(`/api/pacientes?${params}`);
      if (r.ok) {
        const data = await r.json();
        setPacientes(data.pacientes ?? []);
        setTotal(data.total ?? 0);
        if (selecionado) {
          const updated = (data.pacientes ?? []).find((x: CsPaciente) => x.id === selecionado.id);
          setSelecionado(updated ?? null);
        }
      }
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      fetchPacientes(busca, 0);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPacientes(busca, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / 20);
  const filtrados = pacientes;

  async function adicionarNota(pacienteId: string) {
    if (!novaNota.trim()) return;
    setSalvandoNota(true);
    try {
      const r = await fetch(`/api/pacientes/${pacienteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo: novaNota }),
      });
      if (r.ok) {
        const nota = await r.json();
        setPacientes((prev) => prev.map((p) =>
          p.id === pacienteId ? { ...p, notas: [...(p.notas ?? []), nota] } : p
        ));
        if (selecionado?.id === pacienteId) {
          setSelecionado((prev) => prev ? { ...prev, notas: [...(prev.notas ?? []), nota] } : null);
        }
        setNovaNota("");
      }
    } finally { setSalvandoNota(false); }
  }

  return (
    <>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "16px", height: "calc(100vh - 120px)" }}>
      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..."
            style={{ flex: 1, padding: "10px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" }} />
          <button onClick={() => fetchPacientes(busca, page)} disabled={loading} title="Atualizar lista"
            style={{ padding: "10px 12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#777068" }}>{total} paciente{total !== 1 ? "s" : ""}</p>
        {loading && <p style={{ fontSize: "12px", color: "#777068", textAlign: "center", padding: "12px 0" }}>Carregando...</p>}
        {filtrados.map((p) => (
          <button key={p.id} onClick={() => setSelecionado(p)}
            style={{ padding: "14px", background: selecionado?.id === p.id ? "rgba(0,207,255,0.07)" : "#111", border: `1px solid ${selecionado?.id === p.id ? "rgba(0,207,255,0.3)" : BORDER}`, borderRadius: "10px", textAlign: "left", cursor: "pointer", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", background: "rgba(0,207,255,0.08)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <User size={15} color={ACCENT} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: "600", color: selecionado?.id === p.id ? ACCENT : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</p>
                <p style={{ fontSize: "12px", color: "#777068" }}>{p.telefone}</p>
              </div>
              <span style={{ fontSize: "11px", color: "#555" }}>{(p.agendamentos ?? []).length} ag.</span>
            </div>
          </button>
        ))}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${BORDER}`, marginTop: "4px" }}>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: page === 0 ? "#333" : "#9A9288", cursor: page === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: "12px", color: "#777068" }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: page >= totalPages - 1 ? "#333" : "#9A9288", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Detalhe */}
      <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!selecionado ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#777068" }}>
            <div style={{ textAlign: "center" }}>
              <User size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
              <p>Selecione um paciente</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header paciente */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "48px", height: "48px", background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={20} color={ACCENT} />
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{selecionado.nome}</h2>
                  <div style={{ display: "flex", gap: "14px", marginTop: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}><Phone size={11} />{selecionado.telefone}</span>
                    {selecionado.email && <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}><Mail size={11} />{selecionado.email}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Histórico de agendamentos */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "#777068", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                  Histórico ({(selecionado.agendamentos ?? []).length} consultas)
                </p>
                {(selecionado.agendamentos ?? []).length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#555" }}>Sem agendamentos ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(selecionado.agendamentos ?? []).sort((a, b) => b.data.localeCompare(a.data)).map((ag) => (
                      <div key={ag.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#0d0d0d", borderRadius: "8px", border: `1px solid ${BORDER}` }}>
                        <div style={{ width: "3px", height: "30px", background: STATUS_COLORS[ag.status] ?? "#777", borderRadius: "99px" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "#fff", fontWeight: "500" }}>{formatarData(ag.data)} às {ag.hora}</span>
                            <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "99px", background: `${STATUS_COLORS[ag.status]}18`, color: STATUS_COLORS[ag.status] }}>{STATUS_LABELS[ag.status]}</span>
                          </div>
                          {ag.procedimento && <p style={{ fontSize: "11px", color: "#777068", marginTop: "2px" }}>{ag.procedimento}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "#777068", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Notas</p>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <input value={novaNota} onChange={(e) => setNovaNota(e.target.value)}
                    placeholder="Adicionar nota..."
                    onKeyDown={(e) => e.key === "Enter" && adicionarNota(selecionado.id)}
                    style={{ flex: 1, padding: "9px 14px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" }} />
                  <button onClick={() => adicionarNota(selecionado.id)} disabled={!novaNota.trim() || salvandoNota}
                    style={{ padding: "9px 14px", background: ACCENT, border: "none", borderRadius: "8px", color: "#000", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", opacity: (!novaNota.trim() || salvandoNota) ? 0.5 : 1 }}>
                    <Plus size={14} />
                  </button>
                </div>
                {(selecionado.notas ?? []).length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#555" }}>Sem notas ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(selecionado.notas ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((nota) => (
                      <div key={nota.id} style={{ padding: "12px 14px", background: "#0d0d0d", borderRadius: "8px", border: `1px solid ${BORDER}` }}>
                        <p style={{ fontSize: "13px", color: "#ccc", lineHeight: 1.5 }}>{nota.conteudo}</p>
                        <p style={{ fontSize: "11px", color: "#444", marginTop: "6px" }}>{new Date(nota.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
