"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Calendar, Clock, User, Phone, Mail, CheckCircle } from "lucide-react";
import type { CsConfig } from "@/types";
import { DIAS_NOMES, formatarData } from "@/lib/calendario";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";

const TURNOS = [
  { label: "Manhã", de: "06:00", ate: "11:59", desc: "06:00 – 11:59" },
  { label: "Tarde", de: "12:00", ate: "17:59", desc: "12:00 – 17:59" },
  { label: "Noite", de: "18:00", ate: "23:59", desc: "18:00 – 23:59" },
];

interface Procedimento { id: string; nome: string; descricao: string | null; categoria: string; }
interface ProfDisp { dia_semana: number; hora_inicio: string; hora_fim: string; ativo: boolean; }
interface Profissional { id: string; nome: string; especialidade: string; bio: string | null; foto_url: string | null; disponibilidade: ProfDisp[]; }
interface QuizPergunta { id: string; pergunta: string; tipo: string; opcoes: string[] | null; obrigatoria: boolean; ordem: number; }

type Step = "tipo" | "procedimento" | "profissional" | "data" | "turno" | "hora" | "dados" | "quiz" | "revisar";
const STEPS: Step[] = ["tipo", "procedimento", "profissional", "data", "turno", "hora", "dados", "quiz", "revisar"];

export default function QuizFlow({ config }: { config: CsConfig | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("tipo");
  const [tipo, setTipo] = useState<"avaliacao" | "retorno" | "">("");
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [procedimentoSel, setProcedimentoSel] = useState<Procedimento | null>(null);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalSel, setProfissionalSel] = useState<Profissional | null>(null);
  const [dataSel, setDataSel] = useState("");
  const [turnoSel, setTurnoSel] = useState("");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horaSel, setHoraSel] = useState("");
  const [dados, setDados] = useState({ nome: "", telefone: "", email: "" });
  const [quizPerguntas, setQuizPerguntas] = useState<QuizPergunta[]>([]);
  const [quizRespostas, setQuizRespostas] = useState<Record<string, string>>({});
  const [loadingProc, setLoadingProc] = useState(false);
  const [loadingProf, setLoadingProf] = useState(false);
  const [loadingH, setLoadingH] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState("");

  const clinica = config?.nome_clinica ?? "Clínica";
  const diasAntes = config?.dias_antecedencia ?? 30;

  useEffect(() => {
    setLoadingProc(true);
    fetch("/api/procedimentos")
      .then((r) => r.json())
      .then((d) => setProcedimentos(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingProc(false));
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((d) => setQuizPerguntas(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!procedimentoSel) return;
    setLoadingProf(true);
    setProfissionais([]);
    setProfissionalSel(null);
    fetch(`/api/profissionais?procedimento_id=${procedimentoSel.id}`)
      .then((r) => r.json())
      .then((d) => setProfissionais(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingProf(false));
  }, [procedimentoSel]);

  useEffect(() => {
    if (!dataSel || !profissionalSel) return;
    setHorarios([]);
    setHoraSel("");
    setTurnoSel("");
    setLoadingH(true);
    fetch(`/api/disponibilidade?data=${dataSel}&profissional_id=${profissionalSel.id}`)
      .then((r) => r.json())
      .then((d) => setHorarios(d.horarios ?? []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, [dataSel, profissionalSel]);

  // Refetch sempre que o usuário entra no passo de turnos — garante slots frescos
  useEffect(() => {
    if (step !== "turno" || !dataSel || !profissionalSel) return;
    setLoadingH(true);
    fetch(`/api/disponibilidade?data=${dataSel}&profissional_id=${profissionalSel.id}`)
      .then((r) => r.json())
      .then((d) => setHorarios(d.horarios ?? []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const diasAtivos = new Set(
    (profissionalSel?.disponibilidade ?? []).filter((d) => d.ativo).map((d) => d.dia_semana)
  );

  const datas: string[] = [];
  if (profissionalSel) {
    const hoje = new Date();
    for (let i = 1; datas.length < diasAntes && i <= diasAntes + 30; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      if (diasAtivos.has(d.getDay())) datas.push(d.toISOString().split("T")[0]);
    }
  }

  const turnosInfo = TURNOS.map((t) => ({
    ...t,
    count: horarios.filter((h) => h >= t.de && h <= t.ate).length,
    temSlots: horarios.some((h) => h >= t.de && h <= t.ate),
  }));

  const horasFiltradas = turnoSel
    ? horarios.filter((h) => {
        const t = TURNOS.find((x) => x.label === turnoSel);
        return t ? h >= t.de && h <= t.ate : true;
      })
    : horarios;

  const procFiltrados = procedimentos.filter((p) =>
    tipo === "avaliacao"
      ? ["avaliacao", "ambos"].includes(p.categoria)
      : tipo === "retorno"
      ? ["retorno", "ambos"].includes(p.categoria)
      : true
  );

  const currIdx = STEPS.indexOf(step);
  const prog = Math.round((currIdx / (STEPS.length - 1)) * 100);

  function go(s: Step) {
    setErro("");
    setStep(s);
  }
  function back() {
    const p = currIdx - 1;
    if (p >= 0) setStep(STEPS[p]);
  }

  async function submit() {
    setSubmitting(true);
    setErro("");
    try {
      const r = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente: dados,
          data: dataSel,
          hora: horaSel,
          profissional_id: profissionalSel?.id,
          tipo_agendamento: tipo || undefined,
          procedimento_id: procedimentoSel?.id,
          procedimento: procedimentoSel?.nome,
          quiz_respostas: quizRespostas,
        }),
      });
      if (r.status === 409) {
        // Horário foi reservado enquanto o usuário preenchia os dados — refetch e volta
        const dispR = await fetch(`/api/disponibilidade?data=${dataSel}&profissional_id=${profissionalSel?.id}`);
        const dispD = await dispR.json();
        setHorarios(dispD.horarios ?? []);
        setHoraSel("");
        setErro("Este horário acabou de ser reservado. Escolha outro.");
        go("hora");
        return;
      }
      if (!r.ok) {
        const d = await r.json();
        setErro(d.error ?? "Erro ao agendar.");
        return;
      }
      router.push(
        `/agendar/confirmacao?nome=${encodeURIComponent(dados.nome)}&data=${dataSel}&hora=${encodeURIComponent(horaSel)}&clinica=${encodeURIComponent(clinica)}`
      );
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 800px 600px at 18% 12%, rgba(0,207,255,0.09) 0%, transparent 68%), radial-gradient(ellipse 600px 500px at 82% 88%, rgba(0,207,255,0.06) 0%, transparent 62%), linear-gradient(160deg, #07090d 0%, #080808 50%, #06080b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 24px 40px", fontFamily: "system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes tf  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-8px)} }
        @keyframes bg1 { 0%,100%{transform:translateY(0px)}  50%{transform:translateY(-18px)} }
        @keyframes bg2 { 0%,100%{transform:translateY(0px)}  50%{transform:translateY(-12px)} }
        @keyframes bg3 { 0%,100%{transform:translateY(0px)}  50%{transform:translateY(-22px)} }
        @keyframes bg4 { 0%,100%{transform:translateY(0px)}  50%{transform:translateY(-10px)} }
      `}</style>

      {/* Background teeth */}
      {([
        { left:"-7%",  top:"-4%",  size:220, op:0.038, rot:-22, anim:"bg1", dur:"5.2s",  del:"0s"   },
        { left:"76%",  top:"-3%",  size:150, op:0.028, rot: 16, anim:"bg2", dur:"4.5s",  del:"1.4s" },
        { left:"80%",  top:"55%",  size:190, op:0.042, rot: 10, anim:"bg3", dur:"6.1s",  del:"0.6s" },
        { left:"-5%",  top:"62%",  size:130, op:0.030, rot:-14, anim:"bg4", dur:"4.8s",  del:"2.1s" },
        { left:"88%",  top:"30%",  size: 95, op:0.020, rot: 32, anim:"bg1", dur:"3.9s",  del:"1.8s" },
        { left:"24%",  top:"86%",  size:140, op:0.025, rot: -6, anim:"bg2", dur:"5.6s",  del:"0.3s" },
        { left:"52%",  top:"-6%",  size:100, op:0.018, rot: 20, anim:"bg3", dur:"4.2s",  del:"3.0s" },
      ] as const).map((t, i) => (
        <div key={i} style={{ position: "absolute", left: t.left, top: t.top, transform: `rotate(${t.rot}deg)`, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ animation: `${t.anim} ${t.dur} ease-in-out ${t.del} infinite`, opacity: t.op }}>
            <svg width={t.size} height={Math.round(t.size * 1.24)} viewBox="0 0 50 62" fill="none">
              <path d="M25 4C17 4 9 9 7 19C5 27 4 38 6 49C8 57 13 61 17 59C21 57 24 52 25 52C26 52 29 57 33 59C37 61 42 57 44 49C46 38 45 27 43 19C41 9 33 4 25 4Z" stroke="#00CFFF" strokeWidth="1.5" fill="rgba(0,207,255,0.12)" strokeLinejoin="round"/>
              <line x1="17" y1="52" x2="14" y2="62" stroke="#00CFFF" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="25" y1="52" x2="25" y2="62" stroke="#00CFFF" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="33" y1="52" x2="36" y2="62" stroke="#00CFFF" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      ))}

      <div style={{ width: "100%", maxWidth: "500px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ animation: "tf 3s ease-in-out infinite", display: "inline-block", marginBottom: "6px" }}>
            <svg width="34" height="42" viewBox="0 0 50 62" fill="none">
              <path d="M25 4C17 4 9 9 7 19C5 27 4 38 6 49C8 57 13 61 17 59C21 57 24 52 25 52C26 52 29 57 33 59C37 61 42 57 44 49C46 38 45 27 43 19C41 9 33 4 25 4Z" stroke={ACCENT} strokeWidth="2" fill="rgba(0,207,255,0.1)" strokeLinejoin="round"/>
              <line x1="17" y1="52" x2="14" y2="62" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="25" y1="52" x2="25" y2="62" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="33" y1="52" x2="36" y2="62" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: "11px", fontWeight: "600", color: ACCENT, letterSpacing: "0.14em", textTransform: "uppercase" }}>{clinica}</p>
          {step !== "tipo" && (
            <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", marginTop: "10px" }}>
              <div style={{ height: "100%", width: `${prog}%`, background: ACCENT, borderRadius: "99px", transition: "width 0.3s ease" }} />
            </div>
          )}
        </div>

        {/* TIPO */}
        {step === "tipo" && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>Agende sua consulta</h1>
            <p style={{ fontSize: "14px", color: "#9A9288", marginBottom: "32px" }}>Qual o tipo de consulta?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(
                [
                  ["avaliacao", "Avaliação", "Primeira vez ou novo sintoma"] as const,
                  ["retorno", "Retorno", "Continuação do tratamento"] as const,
                ]
              ).map(([val, label, desc]) => (
                <button
                  key={val}
                  onClick={() => { setTipo(val); go("procedimento"); }}
                  style={{ padding: "18px 20px", background: tipo === val ? "rgba(0,207,255,0.1)" : "#111", border: `1px solid ${tipo === val ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "12px", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                >
                  <p style={{ fontSize: "15px", fontWeight: "700", color: tipo === val ? ACCENT : "#fff", marginBottom: "3px" }}>{label}</p>
                  <p style={{ fontSize: "12px", color: "#9A9288" }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PROCEDIMENTO */}
        {step === "procedimento" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>
              {tipo === "avaliacao" ? "O que está sentindo?" : "Qual procedimento?"}
            </h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "20px" }}>Selecione a opção que melhor descreve.</p>
            {loadingProc ? (
              <p style={{ color: "#777068", textAlign: "center", padding: "24px 0" }}>Carregando...</p>
            ) : procFiltrados.length === 0 ? (
              <p style={{ color: "#777068", textAlign: "center", padding: "24px 0" }}>Nenhuma opção cadastrada ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {procFiltrados.map((p) => {
                  const sel = procedimentoSel?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => setProcedimentoSel(p)}
                      style={{ padding: "13px 16px", background: sel ? "rgba(0,207,255,0.1)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "10px", cursor: "pointer", textAlign: "left" }}>
                      <p style={{ fontSize: "14px", fontWeight: sel ? "600" : "400", color: sel ? ACCENT : "#ccc" }}>{p.nome}</p>
                      {p.descricao && <p style={{ fontSize: "11px", color: "#777068", marginTop: "2px" }}>{p.descricao}</p>}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn disabled={!procedimentoSel} onClick={() => go("profissional")}>Próximo <ChevronRight size={15} /></Btn>
            </div>
          </div>
        )}

        {/* PROFISSIONAL */}
        {step === "profissional" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "4px" }}>Escolha o profissional</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "20px" }}>{procedimentoSel?.nome}</p>
            {loadingProf ? (
              <p style={{ color: "#777068", textAlign: "center", padding: "24px 0" }}>Carregando...</p>
            ) : profissionais.length === 0 ? (
              <p style={{ color: "#777068", textAlign: "center", padding: "24px 0" }}>Nenhum profissional disponível para este procedimento.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {profissionais.map((p) => {
                  const sel = profissionalSel?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => { setProfissionalSel(p); setDataSel(""); }}
                      style={{ padding: "14px 16px", background: sel ? "rgba(0,207,255,0.1)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "12px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: sel ? "rgba(0,207,255,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${sel ? "rgba(0,207,255,0.3)" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {p.foto_url
                          ? <img src={p.foto_url} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <User size={20} color={sel ? ACCENT : "#555"} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: sel ? ACCENT : "#fff" }}>{p.nome}</p>
                        <p style={{ fontSize: "12px", color: "#9A9288" }}>{p.especialidade}</p>
                        {p.bio && (
                          <p style={{ fontSize: "11px", color: "#666", marginTop: "3px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
                            {p.bio}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn disabled={!profissionalSel} onClick={() => go("data")}>Próximo <ChevronRight size={15} /></Btn>
            </div>
          </div>
        )}

        {/* DATA */}
        {step === "data" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "4px" }}>Escolha a data</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "20px" }}>{profissionalSel?.nome}</p>
            {datas.length === 0 ? (
              <p style={{ color: "#777068", textAlign: "center", padding: "32px 0" }}>Sem disponibilidade nos próximos dias.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(86px,1fr))", gap: "8px", marginBottom: "24px" }}>
                {datas.slice(0, 18).map((d) => {
                  const dt = new Date(d + "T12:00:00");
                  const sel = dataSel === d;
                  return (
                    <button key={d} onClick={() => setDataSel(d)}
                      style={{ padding: "12px 6px", background: sel ? "rgba(0,207,255,0.12)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "10px", cursor: "pointer" }}>
                      <p style={{ fontSize: "10px", color: sel ? ACCENT : "#777068", textTransform: "uppercase" }}>{DIAS_NOMES[dt.getDay()]}</p>
                      <p style={{ fontSize: "18px", fontWeight: "700", color: sel ? ACCENT : "#fff" }}>{String(dt.getDate()).padStart(2, "0")}</p>
                      <p style={{ fontSize: "10px", color: sel ? ACCENT : "#777068" }}>{dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</p>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn disabled={!dataSel} onClick={() => go("turno")}>Escolher período <ChevronRight size={15} /></Btn>
            </div>
          </div>
        )}

        {/* TURNO */}
        {step === "turno" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "4px" }}>Qual período?</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "20px" }}>{formatarData(dataSel)}</p>
            {loadingH ? (
              <p style={{ color: "#777068", textAlign: "center", padding: "32px 0" }}>Verificando horários...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {turnosInfo.map((t) => {
                  const sel = turnoSel === t.label;
                  const disabled = !t.temSlots;
                  return (
                    <button key={t.label} disabled={disabled} onClick={() => setTurnoSel(t.label)}
                      style={{ padding: "16px 20px", background: sel ? "rgba(0,207,255,0.1)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "12px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: "600", color: sel ? ACCENT : "#fff", marginBottom: "2px" }}>{t.label}</p>
                        <p style={{ fontSize: "12px", color: "#777068" }}>{t.desc}</p>
                      </div>
                      {disabled
                        ? <span style={{ fontSize: "11px", color: "#555", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: "99px" }}>Indisponível</span>
                        : <span style={{ fontSize: "12px", color: sel ? ACCENT : "#777068", fontWeight: sel ? "600" : "400" }}>{t.count} {t.count === 1 ? "horário" : "horários"}</span>
                      }
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn disabled={!turnoSel || loadingH} onClick={() => go("hora")}>Ver horários <ChevronRight size={15} /></Btn>
            </div>
          </div>
        )}

        {/* HORA */}
        {step === "hora" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "4px" }}>Escolha o horário</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: erro ? "10px" : "20px" }}>{turnoSel} · {formatarData(dataSel)}</p>
            {erro && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", color: "#EF4444", fontSize: "13px", marginBottom: "16px" }}>
                {erro}
              </div>
            )}
            {horasFiltradas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <p style={{ color: "#777068", marginBottom: "12px" }}>Sem horários disponíveis neste turno.</p>
                <button onClick={() => { setTurnoSel(""); back(); }}
                  style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", fontSize: "13px" }}>
                  Outro turno
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(76px,1fr))", gap: "8px", marginBottom: "24px" }}>
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
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn disabled={!horaSel} onClick={() => go("dados")}>Continuar <ChevronRight size={15} /></Btn>
            </div>
          </div>
        )}

        {/* DADOS */}
        {step === "dados" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>Seus dados</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "20px" }}>Para confirmar o agendamento.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {(
                [
                  ["Nome completo *", "nome", <User key="u" size={14} />, "Como prefere ser chamado?"],
                  ["WhatsApp *", "telefone", <Phone key="p" size={14} />, "(11) 99999-9999"],
                  ["E-mail (opcional)", "email", <Mail key="m" size={14} />, "seu@email.com"],
                ] as [string, keyof typeof dados, React.ReactNode, string][]
              ).map(([label, key, icon, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#555" }}>{icon}</div>
                    <input value={dados[key]} onChange={(e) => setDados({ ...dados, [key]: e.target.value })} placeholder={ph}
                      style={{ width: "100%", padding: "12px 14px 12px 36px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn disabled={!dados.nome || !dados.telefone} onClick={() => go(quizPerguntas.length > 0 ? "quiz" : "revisar")}>
                {quizPerguntas.length > 0 ? "Próximo" : "Revisar"} <ChevronRight size={15} />
              </Btn>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {step === "quiz" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>Mais algumas perguntas</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "24px" }}>Isso nos ajuda a preparar melhor o seu atendimento.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
              {quizPerguntas.map((p) => (
                <div key={p.id}>
                  <p style={{ fontSize: "13px", color: "#ccc", marginBottom: "10px", fontWeight: "500" }}>
                    {p.pergunta}
                    {p.obrigatoria && <span style={{ color: "#EF4444", marginLeft: "4px" }}>*</span>}
                  </p>
                  {p.tipo === "single_choice" && p.opcoes && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {p.opcoes.map((op) => {
                        const sel = quizRespostas[p.pergunta] === op;
                        return (
                          <button key={op} onClick={() => setQuizRespostas({ ...quizRespostas, [p.pergunta]: op })}
                            style={{ padding: "10px 14px", background: sel ? "rgba(0,207,255,0.1)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "8px", cursor: "pointer", textAlign: "left", fontSize: "13px", color: sel ? ACCENT : "#ccc" }}>
                            {op}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {p.tipo === "boolean" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      {["Sim", "Não"].map((op) => {
                        const sel = quizRespostas[p.pergunta] === op;
                        return (
                          <button key={op} onClick={() => setQuizRespostas({ ...quizRespostas, [p.pergunta]: op })}
                            style={{ flex: 1, padding: "10px", background: sel ? "rgba(0,207,255,0.1)" : "#111", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: sel ? ACCENT : "#ccc", fontWeight: sel ? "600" : "400" }}>
                            {op}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {p.tipo === "text" && (
                    <textarea
                      value={quizRespostas[p.pergunta] ?? ""}
                      onChange={(e) => setQuizRespostas({ ...quizRespostas, [p.pergunta]: e.target.value })}
                      rows={3} placeholder="Digite sua resposta..."
                      style={{ width: "100%", padding: "12px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", resize: "none", outline: "none", boxSizing: "border-box" }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn
                disabled={quizPerguntas.filter((p) => p.obrigatoria).some((p) => !quizRespostas[p.pergunta])}
                onClick={() => go("revisar")}>
                Revisar <ChevronRight size={15} />
              </Btn>
            </div>
          </div>
        )}

        {/* REVISAR */}
        {step === "revisar" && (
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>Confirmar</h2>
            <p style={{ fontSize: "13px", color: "#9A9288", marginBottom: "20px" }}>Revise antes de confirmar.</p>
            <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
              {(
                [
                  ["Tipo", tipo === "avaliacao" ? "Avaliação" : "Retorno"],
                  ["Procedimento", procedimentoSel?.nome ?? "—"],
                  ["Profissional", profissionalSel?.nome ?? "—"],
                  ["Data", formatarData(dataSel)],
                  ["Horário", horaSel],
                  ["Nome", dados.nome],
                  ["WhatsApp", dados.telefone],
                ] as [string, string][]
              ).map(([l, v]) => (
                <div key={l} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: ACCENT, marginTop: "6px", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "11px", color: "#777068" }}>{l}</p>
                    <p style={{ fontSize: "13px", color: "#fff", fontWeight: "500" }}>{v}</p>
                  </div>
                </div>
              ))}
            </div>
            {erro && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", color: "#EF4444", fontSize: "13px", marginBottom: "14px" }}>
                {erro}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <BtnSec onClick={back}><ChevronLeft size={15} /> Voltar</BtnSec>
              <Btn disabled={submitting} onClick={submit}>
                {submitting ? "Agendando..." : <><CheckCircle size={15} /> Confirmar</>}
              </Btn>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ flex: 2, padding: "13px 16px", background: disabled ? "#1a1a1a" : ACCENT, border: `1px solid ${disabled ? BORDER : "transparent"}`, borderRadius: "10px", color: disabled ? "#444" : "#000", fontSize: "14px", fontWeight: "700", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "opacity 0.15s" }}>
      {children}
    </button>
  );
}

function BtnSec({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ flex: 1, padding: "13px 16px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", color: "#9A9288", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
      {children}
    </button>
  );
}
