"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { DIAS_NOMES, formatarData } from "@/lib/calendario";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";
const TURNOS = [
  { label: "Manhã",  de: "06:00", ate: "11:59" },
  { label: "Tarde",  de: "12:00", ate: "17:59" },
  { label: "Noite",  de: "18:00", ate: "23:59" },
];

export default function ReagendarPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ag, setAg] = useState<any>(null);
  const [loadingAg, setLoadingAg] = useState(true);
  const [erro, setErro] = useState("");

  const [datas, setDatas] = useState<string[]>([]);
  const [dataSel, setDataSel] = useState("");
  const [turnoSel, setTurnoSel] = useState("");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horaSel, setHoraSel] = useState("");
  const [loadingH, setLoadingH] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [step, setStep] = useState<"data" | "turno" | "hora" | "confirmado">("data");

  useEffect(() => {
    fetch(`/api/agendamentos/${id}/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErro(d.error); return; }
        setAg(d);
        // Compute available dates from professional's schedule
        const disp: { dia_semana: number; ativo: boolean }[] = d.disponibilidade ?? [];
        const diasAtivos = new Set(disp.filter((x: any) => x.ativo).map((x: any) => x.dia_semana));
        const dates: string[] = [];
        const hoje = new Date();
        for (let i = 1; dates.length < 30 && i <= 60; i++) {
          const dt = new Date(hoje);
          dt.setDate(hoje.getDate() + i);
          if (diasAtivos.has(dt.getDay())) {
            dates.push(dt.toISOString().split("T")[0]);
          }
        }
        setDatas(dates);
      })
      .catch(() => setErro("Erro ao carregar agendamento."))
      .finally(() => setLoadingAg(false));
  }, [id]);

  useEffect(() => {
    if (!dataSel || !ag?.profissional_id) return;
    setHorarios([]);
    setHoraSel("");
    setTurnoSel("");
    setLoadingH(true);
    fetch(`/api/disponibilidade?data=${dataSel}&profissional_id=${ag.profissional_id}`)
      .then((r) => r.json())
      .then((d) => setHorarios(d.horarios ?? []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, [dataSel, ag?.profissional_id]);

  async function confirmar() {
    setSalvando(true);
    setErro("");
    try {
      const r = await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataSel, hora: horaSel, status: "pendente" }),
      });
      if (r.status === 409) {
        const fresh = await fetch(`/api/disponibilidade?data=${dataSel}&profissional_id=${ag.profissional_id}`);
        const fd = await fresh.json();
        setHorarios(fd.horarios ?? []);
        setHoraSel("");
        setErro("Este horário acabou de ser reservado. Escolha outro.");
        setStep("hora");
        return;
      }
      if (!r.ok) { const d = await r.json(); setErro(d.error ?? "Erro."); return; }
      setStep("confirmado");
    } finally { setSalvando(false); }
  }

  const turnosInfo = TURNOS.map((t) => ({
    ...t,
    count: horarios.filter((h) => h >= t.de && h <= t.ate).length,
    temSlots: horarios.some((h) => h >= t.de && h <= t.ate),
  }));

  const horasFiltradas = turnoSel
    ? horarios.filter((h) => { const t = TURNOS.find((x) => x.label === turnoSel); return t ? h >= t.de && h <= t.ate : true; })
    : horarios;

  if (loadingAg) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#9A9288", fontSize: "14px" }}>Carregando...</p>
      </div>
    );
  }

  if (erro && !ag) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#EF4444", fontSize: "16px", marginBottom: "8px" }}>Link inválido</p>
          <p style={{ color: "#777068", fontSize: "13px" }}>{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#07090d 0%,#080808 50%,#06080b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <p style={{ fontSize: "11px", fontWeight: "600", color: ACCENT, letterSpacing: "0.14em", textTransform: "uppercase" }}>{ag?.clinica ?? "Clínica"}</p>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginTop: "6px" }}>Reagendamento</h1>
        </div>

        {/* Info atual */}
        {step !== "confirmado" && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
            <p style={{ fontSize: "11px", color: "#777068", marginBottom: "4px" }}>Consulta atual</p>
            <p style={{ fontSize: "14px", color: "#fff", fontWeight: "600" }}>{formatarData(ag?.data)} às {ag?.hora}</p>
            {ag?.profissional_nome && <p style={{ fontSize: "12px", color: "#9A9288", marginTop: "2px" }}>{ag.profissional_nome}</p>}
          </div>
        )}

        {step === "confirmado" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <CheckCircle size={48} color="#10B981" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>Reagendado!</p>
            <p style={{ fontSize: "14px", color: "#9A9288" }}>{formatarData(dataSel)} às {horaSel}</p>
          </div>
        )}

        {step === "data" && (
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#fff", marginBottom: "16px" }}>Escolha a nova data</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: "8px", marginBottom: "20px" }}>
              {datas.slice(0, 18).map((d) => {
                const dt = new Date(d + "T12:00:00");
                const sel = dataSel === d;
                return (
                  <button key={d} onClick={() => setDataSel(d)}
                    style={{ padding: "10px 6px", background: sel ? "rgba(0,207,255,0.12)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "10px", cursor: "pointer" }}>
                    <p style={{ fontSize: "10px", color: sel ? ACCENT : "#777068", textTransform: "uppercase" }}>{DIAS_NOMES[dt.getDay()]}</p>
                    <p style={{ fontSize: "17px", fontWeight: "700", color: sel ? ACCENT : "#fff" }}>{String(dt.getDate()).padStart(2,"0")}</p>
                    <p style={{ fontSize: "10px", color: sel ? ACCENT : "#777068" }}>{dt.toLocaleDateString("pt-BR",{month:"short"}).replace(".","")}</p>
                  </button>
                );
              })}
            </div>
            <button disabled={!dataSel} onClick={() => setStep("turno")}
              style={{ width: "100%", padding: "13px", background: dataSel ? ACCENT : "#1a1a1a", border: "none", borderRadius: "10px", color: dataSel ? "#000" : "#444", fontSize: "14px", fontWeight: "700", cursor: dataSel ? "pointer" : "not-allowed" }}>
              Escolher período <ChevronRight size={15} style={{ verticalAlign: "middle" }} />
            </button>
          </div>
        )}

        {step === "turno" && (
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#fff", marginBottom: "16px" }}>Qual período? · {formatarData(dataSel)}</h2>
            {loadingH ? <p style={{ color: "#777068", textAlign: "center", padding: "24px 0" }}>Verificando horários...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {turnosInfo.map((t) => {
                  const sel = turnoSel === t.label;
                  return (
                    <button key={t.label} disabled={!t.temSlots} onClick={() => setTurnoSel(t.label)}
                      style={{ padding: "14px 18px", background: sel ? "rgba(0,207,255,0.1)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "10px", cursor: t.temSlots ? "pointer" : "not-allowed", opacity: t.temSlots ? 1 : 0.35, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: sel ? ACCENT : "#fff" }}>{t.label}</span>
                      {t.temSlots ? <span style={{ fontSize: "12px", color: sel ? ACCENT : "#777068" }}>{t.count} horário{t.count !== 1 ? "s" : ""}</span> : <span style={{ fontSize: "11px", color: "#555" }}>Indisponível</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setStep("data")} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "10px", color: "#9A9288", cursor: "pointer", fontSize: "14px" }}>
                <ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> Voltar
              </button>
              <button disabled={!turnoSel || loadingH} onClick={() => setStep("hora")}
                style={{ flex: 2, padding: "12px", background: turnoSel ? ACCENT : "#1a1a1a", border: "none", borderRadius: "10px", color: turnoSel ? "#000" : "#444", fontSize: "14px", fontWeight: "700", cursor: turnoSel ? "pointer" : "not-allowed" }}>
                Ver horários <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
              </button>
            </div>
          </div>
        )}

        {step === "hora" && (
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>Escolha o horário</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: erro ? "10px" : "16px" }}>{turnoSel} · {formatarData(dataSel)}</p>
            {erro && <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", color: "#EF4444", fontSize: "13px", marginBottom: "14px" }}>{erro}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(72px,1fr))", gap: "8px", marginBottom: "20px" }}>
              {horasFiltradas.map((h) => {
                const sel = horaSel === h;
                return (
                  <button key={h} onClick={() => setHoraSel(h)}
                    style={{ padding: "11px 6px", background: sel ? "rgba(0,207,255,0.12)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "10px", color: sel ? ACCENT : "#ccc", fontSize: "14px", fontWeight: sel ? "700" : "400", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                    <Clock size={11} color={sel ? ACCENT : "#555"} />{h}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setStep("turno"); setErro(""); }} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "10px", color: "#9A9288", cursor: "pointer", fontSize: "14px" }}>
                <ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> Voltar
              </button>
              <button disabled={!horaSel || salvando} onClick={confirmar}
                style={{ flex: 2, padding: "12px", background: horaSel ? ACCENT : "#1a1a1a", border: "none", borderRadius: "10px", color: horaSel ? "#000" : "#444", fontSize: "14px", fontWeight: "700", cursor: horaSel ? "pointer" : "not-allowed" }}>
                {salvando ? "Confirmando..." : <><CheckCircle size={14} style={{ verticalAlign: "middle" }} /> Confirmar</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
