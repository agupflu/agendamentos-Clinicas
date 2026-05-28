"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Phone, User, LogOut, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { formatarData, STATUS_LABELS, STATUS_COLORS } from "@/lib/calendario";
import type { CsAgendamento, CsProfissional } from "@/types";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";

type Filtro = "todos" | "hoje" | "semana";

export default function MinhaAgendaView({
  profissional,
  agendamentos: initial,
}: {
  profissional: Pick<CsProfissional, "id" | "nome" | "especialidade" | "foto_url">;
  agendamentos: CsAgendamento[];
}) {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState(initial);
  const [filtro, setFiltro] = useState<Filtro>("hoje");
  const [loading, setLoading] = useState(false);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const hoje = new Date().toISOString().split("T")[0];
  const fimSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const filtrados = agendamentos.filter((a) => {
    if (filtro === "hoje") return a.data === hoje;
    if (filtro === "semana") return a.data <= fimSemana;
    return true;
  });

  const stats = {
    hoje: agendamentos.filter((a) => a.data === hoje).length,
    pendentes: agendamentos.filter((a) => a.status === "pendente" && a.data === hoje).length,
    semana: agendamentos.filter((a) => a.data <= fimSemana).length,
  };

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch(`/api/agendamentos?profissional_id=${profissional.id}&a_partir=${hoje}`);
      if (r.ok) setAgendamentos(await r.json());
    } finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: string) {
    setAtualizandoId(id);
    try {
      const r = await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        const updated = await r.json();
        setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, ...updated } : a));
      }
    } finally { setAtualizandoId(null); }
  }

  async function logout() {
    await fetch("/api/profissional/auth", { method: "DELETE" });
    router.push("/profissional/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {profissional.foto_url
              ? <img src={profissional.foto_url} alt={profissional.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <User size={18} color={ACCENT} />}
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>{profissional.nome}</p>
            <p style={{ fontSize: "12px", color: "#777068" }}>{profissional.especialidade}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={refresh} disabled={loading}
            style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Atualizar
          </button>
          <button onClick={logout}
            style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: "720px", margin: "0 auto" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Hoje", value: stats.hoje, color: ACCENT },
            { label: "Pendentes hoje", value: stats.pendentes, color: "#F59E0B" },
            { label: "Próximos 7 dias", value: stats.semana, color: "#fff" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px" }}>
              <p style={{ fontSize: "11px", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>{label}</p>
              <p style={{ fontSize: "28px", fontWeight: "700", color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          {(["hoje", "semana", "todos"] as Filtro[]).map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              style={{ padding: "6px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer", border: `1px solid ${filtro === f ? ACCENT : BORDER}`, background: filtro === f ? "rgba(0,207,255,0.1)" : "transparent", color: filtro === f ? ACCENT : "#9A9288" }}>
              {f === "hoje" ? "Hoje" : f === "semana" ? "Próximos 7 dias" : "Todos"}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#777068" }}>
            <Calendar size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p>Nenhum agendamento {filtro === "hoje" ? "para hoje" : filtro === "semana" ? "nos próximos 7 dias" : ""}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtrados.map((ag) => (
              <AgendamentoCard key={ag.id} ag={ag} onStatusChange={updateStatus} loading={atualizandoId === ag.id} />
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AgendamentoCard({ ag, onStatusChange, loading }: {
  ag: CsAgendamento;
  onStatusChange: (id: string, status: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cor = STATUS_COLORS[ag.status] ?? "#777";
  const hoje = new Date().toISOString().split("T")[0];
  const ehHoje = ag.data === hoje;

  return (
    <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: "4px", height: "44px", background: cor, borderRadius: "99px", flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{ag.paciente?.nome ?? "—"}</span>
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", background: `${cor}18`, color: cor, border: `1px solid ${cor}30` }}>
              {STATUS_LABELS[ag.status]}
            </span>
            {ehHoje && <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", background: "rgba(0,207,255,0.08)", color: ACCENT, border: `1px solid rgba(0,207,255,0.2)` }}>Hoje</span>}
          </div>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar size={11} /> {formatarData(ag.data)}
            </span>
            <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={11} /> {ag.hora}{ag.hora_fim ? ` – ${ag.hora_fim}` : ""}
            </span>
            {ag.paciente?.telefone && (
              <span style={{ fontSize: "12px", color: "#9A9288", display: "flex", alignItems: "center", gap: "4px" }}>
                <Phone size={11} /> {ag.paciente.telefone}
              </span>
            )}
          </div>
          {ag.procedimento && <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>{ag.procedimento}</p>}
        </div>

        {/* Ações rápidas */}
        {ag.status === "pendente" && (
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button disabled={loading} onClick={() => onStatusChange(ag.id, "confirmado")}
              style={{ padding: "6px 10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", color: "#10B981", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
              <CheckCircle size={13} /> Confirmar
            </button>
            <button disabled={loading} onClick={() => onStatusChange(ag.id, "cancelado")}
              style={{ padding: "6px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "6px", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
              <XCircle size={13} /> Cancelar
            </button>
          </div>
        )}
        {ag.status === "confirmado" && (
          <button disabled={loading} onClick={(e) => { e.stopPropagation(); onStatusChange(ag.id, "concluido"); }}
            style={{ padding: "6px 12px", background: "rgba(107,114,128,0.1)", border: "1px solid rgba(107,114,128,0.3)", borderRadius: "6px", color: "#6B7280", cursor: "pointer", fontSize: "12px", flexShrink: 0 }}>
            {loading ? "..." : "Concluir"}
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px", background: "#0d0d0d" }}>
          {ag.quiz_respostas && Object.keys(ag.quiz_respostas).length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "11px", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Respostas do paciente</p>
              {Object.entries(ag.quiz_respostas).map(([k, v]) => (
                <div key={k} style={{ marginBottom: "6px" }}>
                  <p style={{ fontSize: "11px", color: "#555" }}>{k}</p>
                  <p style={{ fontSize: "13px", color: "#ccc" }}>{v}</p>
                </div>
              ))}
            </div>
          )}
          {ag.observacoes && (
            <div>
              <p style={{ fontSize: "11px", color: "#777068", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Observações</p>
              <p style={{ fontSize: "13px", color: "#ccc" }}>{ag.observacoes}</p>
            </div>
          )}
          <p style={{ fontSize: "11px", color: "#444", marginTop: "10px" }}>
            Agendado em {new Date(ag.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}
