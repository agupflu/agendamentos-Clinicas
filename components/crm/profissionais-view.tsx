"use client";

import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from "react";
import { User, Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Camera, Clock } from "lucide-react";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";
const DIAS_NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface NichoProc { nome: string; descricao?: string; categoria: "avaliacao" | "retorno" | "ambos" }
interface Nicho { id: string; label: string; emoji: string; procs: NichoProc[] }

const NICHOS: Nicho[] = [
  {
    id: "dentista", label: "Dentista", emoji: "🦷",
    procs: [
      { nome: "Dor de dente",                 categoria: "avaliacao" },
      { nome: "Sensibilidade nos dentes",      categoria: "avaliacao" },
      { nome: "Sangramento na gengiva",        categoria: "avaliacao" },
      { nome: "Dente quebrado ou lascado",     categoria: "avaliacao" },
      { nome: "Inchaço na boca ou rosto",      categoria: "avaliacao" },
      { nome: "Bruxismo (ranger dentes)",      categoria: "avaliacao" },
      { nome: "Halitose (mau hálito)",         categoria: "avaliacao" },
      { nome: "Clareamento dental",            categoria: "retorno"   },
      { nome: "Aparelho ortodôntico",          categoria: "retorno"   },
      { nome: "Implante dentário",             categoria: "retorno"   },
      { nome: "Tratamento de canal",           categoria: "retorno"   },
      { nome: "Extração dentária",             categoria: "retorno"   },
      { nome: "Limpeza e profilaxia",          categoria: "ambos"     },
    ],
  },
  {
    id: "medico", label: "Médico geral", emoji: "🩺",
    procs: [
      { nome: "Febre",                         categoria: "avaliacao" },
      { nome: "Dor de cabeça",                 categoria: "avaliacao" },
      { nome: "Tosse ou gripe",                categoria: "avaliacao" },
      { nome: "Dor no corpo",                  categoria: "avaliacao" },
      { nome: "Problemas gastrointestinais",   categoria: "avaliacao" },
      { nome: "Pressão alta",                  categoria: "avaliacao" },
      { nome: "Check-up anual",                categoria: "avaliacao" },
      { nome: "Resultado de exames",           categoria: "retorno"   },
      { nome: "Renovação de receita",          categoria: "retorno"   },
      { nome: "Acompanhamento de tratamento",  categoria: "retorno"   },
    ],
  },
  {
    id: "psicologo", label: "Psicólogo", emoji: "🧠",
    procs: [
      { nome: "Ansiedade",                     categoria: "avaliacao" },
      { nome: "Depressão",                     categoria: "avaliacao" },
      { nome: "Estresse no trabalho",          categoria: "avaliacao" },
      { nome: "Problemas de sono",             categoria: "avaliacao" },
      { nome: "Relacionamentos",               categoria: "avaliacao" },
      { nome: "Autoestima e autoconfiança",    categoria: "avaliacao" },
      { nome: "Luto ou perda",                 categoria: "avaliacao" },
      { nome: "Fobias e medos",                categoria: "avaliacao" },
      { nome: "Continuação da terapia",        categoria: "retorno"   },
    ],
  },
  {
    id: "fisio", label: "Fisioterapeuta", emoji: "🏃",
    procs: [
      { nome: "Dor nas costas",                categoria: "avaliacao" },
      { nome: "Dor no joelho",                 categoria: "avaliacao" },
      { nome: "Lesão esportiva",               categoria: "avaliacao" },
      { nome: "Dor no ombro ou pescoço",       categoria: "avaliacao" },
      { nome: "Recuperação pós-cirúrgica",     categoria: "avaliacao" },
      { nome: "Hérnia de disco",               categoria: "avaliacao" },
      { nome: "Continuação do tratamento",     categoria: "retorno"   },
    ],
  },
  {
    id: "dermato", label: "Dermatologista", emoji: "✨",
    procs: [
      { nome: "Acne",                          categoria: "avaliacao" },
      { nome: "Manchas na pele",               categoria: "avaliacao" },
      { nome: "Queda de cabelo",               categoria: "avaliacao" },
      { nome: "Coceira ou alergia",            categoria: "avaliacao" },
      { nome: "Lesão suspeita",                categoria: "avaliacao" },
      { nome: "Botox e preenchimento",         categoria: "retorno"   },
      { nome: "Acompanhamento de tratamento",  categoria: "retorno"   },
    ],
  },
  {
    id: "nutri", label: "Nutricionista", emoji: "🥗",
    procs: [
      { nome: "Emagrecimento",                 categoria: "avaliacao" },
      { nome: "Ganho de massa muscular",       categoria: "avaliacao" },
      { nome: "Diabetes e glicemia",           categoria: "avaliacao" },
      { nome: "Hipertensão",                   categoria: "avaliacao" },
      { nome: "Distúrbios alimentares",        categoria: "avaliacao" },
      { nome: "Acompanhamento nutricional",    categoria: "retorno"   },
      { nome: "Revisão de cardápio",           categoria: "retorno"   },
    ],
  },
];

interface Procedimento { id: string; nome: string; descricao: string | null; categoria: string; ordem: number; }
interface ProfDisp { dia_semana: number; hora_inicio: string; hora_fim: string; ativo: boolean; }
interface Profissional { id: string; nome: string; especialidade: string; foto_url: string | null; ativo: boolean; disponibilidade?: ProfDisp[]; procedimento_ids?: string[]; }

type RangeItem = { hora_inicio: string; hora_fim: string };
type DiaForm = { dia_semana: number; ativo: boolean; ranges: RangeItem[] };

function defaultDias(): DiaForm[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dia_semana: i,
    ativo: i >= 1 && i <= 5,
    ranges: [{ hora_inicio: "08:00", hora_fim: "18:00" }],
  }));
}

function parseTags(s: string): string[] {
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

function groupDispByDay(disps: ProfDisp[]): DiaForm[] {
  return defaultDias().map((def) => {
    const dayRanges = disps.filter((d) => d.dia_semana === def.dia_semana);
    if (!dayRanges.length) return def;
    return {
      dia_semana: def.dia_semana,
      ativo: true,
      ranges: dayRanges.map((d) => ({ hora_inicio: d.hora_inicio, hora_fim: d.hora_fim })),
    };
  });
}

export default function ProfissionaisView() {
  const [tab, setTab] = useState<"profissionais" | "procedimentos">("profissionais");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"prof" | "proc" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nichoModal, setNichoModal] = useState(false);
  const [nichoSel, setNichoSel] = useState<Nicho | null>(null);
  const [importando, setImportando] = useState(false);

  // Prof form state
  const [pfNome, setPfNome] = useState("");
  const [pfEmail, setPfEmail] = useState("");
  const [pfSenha, setPfSenha] = useState("");
  const [pfTags, setPfTags] = useState<string[]>([]);
  const [pfTagInput, setPfTagInput] = useState("");
  const [pfFoto, setPfFoto] = useState<string | null>(null);
  const [pfAtivo, setPfAtivo] = useState(true);
  const [pfProcIds, setPfProcIds] = useState<string[]>([]);
  const [pfDisp, setPfDisp] = useState<DiaForm[]>(defaultDias());
  const [showSenha, setShowSenha] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  // Proc form state
  const [pcNome, setPcNome] = useState("");
  const [pcDesc, setPcDesc] = useState("");
  const [pcCat, setPcCat] = useState<"avaliacao" | "retorno" | "ambos">("ambos");
  const [pcOrdem, setPcOrdem] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [pr, pc] = await Promise.all([
      fetch("/api/profissionais").then((r) => r.json()).catch(() => []),
      fetch("/api/procedimentos").then((r) => r.json()).catch(() => []),
    ]);
    setProfissionais(Array.isArray(pr) ? pr : []);
    setProcedimentos(Array.isArray(pc) ? pc : []);
    setLoading(false);
  }

  function resetProfForm() {
    setPfNome(""); setPfEmail(""); setPfSenha(""); setPfTags([]); setPfTagInput(""); setPfFoto(null);
    setPfAtivo(true); setPfProcIds([]); setPfDisp(defaultDias()); setShowSenha(false);
  }

  async function openEditProf(id: string) {
    const r = await fetch(`/api/profissionais/${id}`);
    if (!r.ok) return;
    const detail: Profissional & { procedimento_ids: string[]; disponibilidade: ProfDisp[] } = await r.json();
    setEditId(id);
    setPfNome(detail.nome);
    setPfEmail(String((detail as unknown as Record<string, unknown>).email ?? ""));
    setPfSenha("");
    setPfTags(parseTags(detail.especialidade));
    setPfFoto(detail.foto_url ?? null);
    setPfAtivo(detail.ativo);
    setPfProcIds(detail.procedimento_ids ?? []);
    setPfDisp(groupDispByDay(detail.disponibilidade ?? []));
    setShowSenha(false);
    setModal("prof");
  }

  function openNewProf() {
    setEditId(null);
    resetProfForm();
    setModal("prof");
  }

  function openNewProc() {
    setEditId(null);
    setPcNome(""); setPcDesc(""); setPcCat("ambos"); setPcOrdem(0);
    setModal("proc");
  }

  function openEditProc(p: Procedimento) {
    setEditId(p.id);
    setPcNome(p.nome); setPcDesc(p.descricao ?? ""); setPcCat(p.categoria as "avaliacao" | "retorno" | "ambos"); setPcOrdem(p.ordem);
    setModal("proc");
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && pfTagInput.trim()) {
      e.preventDefault();
      const tag = pfTagInput.trim();
      if (!pfTags.includes(tag)) setPfTags([...pfTags, tag]);
      setPfTagInput("");
    }
    if (e.key === "Backspace" && !pfTagInput && pfTags.length) {
      setPfTags(pfTags.slice(0, -1));
    }
  }

  function handleFotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPfFoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function applyClinicSchedule() {
    try {
      const r = await fetch("/api/disponibilidade-config");
      const data = await r.json();
      if (!Array.isArray(data)) return;
      const newDisp = defaultDias().map((def) => {
        const found = data.find((d: { dia_semana: number; hora_inicio: string; hora_fim: string; ativo: boolean }) => d.dia_semana === def.dia_semana && d.ativo);
        if (!found) return { ...def, ativo: false };
        return { dia_semana: def.dia_semana, ativo: true, ranges: [{ hora_inicio: found.hora_inicio, hora_fim: found.hora_fim }] };
      });
      setPfDisp(newDisp);
    } catch { /* ignore */ }
  }

  function toggleDia(idx: number) {
    setPfDisp((prev) => prev.map((d) => d.dia_semana === idx ? { ...d, ativo: !d.ativo } : d));
  }

  function addRange(dia: number) {
    setPfDisp((prev) => prev.map((d) => d.dia_semana === dia ? { ...d, ranges: [...d.ranges, { hora_inicio: "08:00", hora_fim: "18:00" }] } : d));
  }

  function removeRange(dia: number, ri: number) {
    setPfDisp((prev) => prev.map((d) => {
      if (d.dia_semana !== dia) return d;
      const ranges = d.ranges.filter((_, i) => i !== ri);
      return { ...d, ranges: ranges.length ? ranges : d.ranges, ativo: ranges.length > 0 ? d.ativo : false };
    }));
  }

  function updateRange(dia: number, ri: number, key: "hora_inicio" | "hora_fim", val: string) {
    setPfDisp((prev) => prev.map((d) => {
      if (d.dia_semana !== dia) return d;
      return { ...d, ranges: d.ranges.map((r, i) => i === ri ? { ...r, [key]: val } : r) };
    }));
  }

  function toggleProcId(id: string) {
    setPfProcIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function flattenDisp() {
    return pfDisp
      .filter((d) => d.ativo)
      .flatMap((d) => d.ranges.map((r) => ({ dia_semana: d.dia_semana, hora_inicio: r.hora_inicio, hora_fim: r.hora_fim, ativo: true })));
  }

  async function saveProf() {
    if (!pfNome.trim()) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      nome: pfNome.trim(),
      especialidade: pfTags.join(", "),
      foto_url: pfFoto ?? null,
      ativo: pfAtivo,
      email: pfEmail.trim() || null,
      procedimento_ids: pfProcIds,
      disponibilidade: flattenDisp(),
    };
    if (pfSenha.trim()) body.senha = pfSenha.trim();
    const url = editId ? `/api/profissionais/${editId}` : "/api/profissionais";
    await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setModal(null);
    setSaving(false);
    fetchAll();
  }

  async function saveProc() {
    if (!pcNome.trim()) return;
    setSaving(true);
    const body = { nome: pcNome.trim(), descricao: pcDesc || null, categoria: pcCat, ordem: pcOrdem };
    const payload = editId ? { id: editId, ...body } : body;
    await fetch("/api/procedimentos", { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setModal(null);
    setSaving(false);
    fetchAll();
  }

  async function deleteProf(id: string) {
    if (!confirm("Remover profissional?")) return;
    await fetch(`/api/profissionais/${id}`, { method: "DELETE" });
    fetchAll();
  }

  async function deleteProc(id: string) {
    if (!confirm("Remover procedimento?")) return;
    await fetch(`/api/procedimentos?id=${id}`, { method: "DELETE" });
    fetchAll();
  }

  async function importarNicho() {
    if (!nichoSel) return;
    setImportando(true);
    const existentes = new Set(procedimentos.map((p) => p.nome.toLowerCase()));
    const novos = nichoSel.procs.filter((p) => !existentes.has(p.nome.toLowerCase()));
    await Promise.all(
      novos.map((p, i) =>
        fetch("/api/procedimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: p.nome, descricao: p.descricao ?? null, categoria: p.categoria, ordem: i }),
        })
      )
    );
    setImportando(false);
    setNichoModal(false);
    setNichoSel(null);
    fetchAll();
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
        {(["profissionais", "procedimentos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 16px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", border: `1px solid ${tab === t ? "rgba(0,207,255,0.3)" : BORDER}`, background: tab === t ? "rgba(0,207,255,0.08)" : "transparent", color: tab === t ? ACCENT : "#9A9288", fontWeight: tab === t ? "600" : "400" }}>
            {t === "profissionais" ? "Profissionais" : "Procedimentos"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#777068", padding: "32px 0", textAlign: "center" }}>Carregando...</p>
      ) : tab === "profissionais" ? (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
            <button onClick={openNewProf}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: ACCENT, border: "none", borderRadius: "8px", color: "#000", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
              <Plus size={14} /> Novo profissional
            </button>
          </div>

          {profissionais.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#777068" }}>
              <User size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
              <p>Nenhum profissional cadastrado</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {profissionais.map((p) => {
                const tags = parseTags(p.especialidade);
                return (
                  <div key={p.id} style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0,207,255,0.08)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {p.foto_url ? <img src={p.foto_url} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={18} color={ACCENT} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{p.nome}</span>
                          {!p.ativo && <span style={{ fontSize: "10px", color: "#555", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, padding: "1px 6px", borderRadius: "99px" }}>inativo</span>}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {tags.map((t) => (
                            <span key={t} style={{ fontSize: "11px", color: ACCENT, background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, padding: "1px 7px", borderRadius: "99px" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => openEditProf(p.id)}
                          style={{ padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#9A9288", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => deleteProf(p.id)}
                          style={{ padding: "6px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Trash2 size={12} />
                        </button>
                        <button onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                          style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#777068", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          {expandido === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    </div>
                    {expandido === p.id && p.disponibilidade && p.disponibilidade.length > 0 && (
                      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 16px", background: "#0d0d0d" }}>
                        <p style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Agenda</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {DIAS_NOMES.map((_, i) => {
                            const ranges = (p.disponibilidade ?? []).filter((d) => d.dia_semana === i);
                            if (!ranges.length) return null;
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "11px", color: "#777068", minWidth: "28px" }}>{DIAS_NOMES[i]}</span>
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  {ranges.map((r, ri) => (
                                    <span key={ri} style={{ fontSize: "11px", color: ACCENT, background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, padding: "2px 8px", borderRadius: "99px" }}>
                                      {r.hora_inicio}–{r.hora_fim}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "14px" }}>
            <button onClick={() => { setNichoSel(null); setNichoModal(true); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "transparent", border: `1px solid rgba(0,207,255,0.25)`, borderRadius: "8px", color: ACCENT, fontSize: "13px", cursor: "pointer" }}>
              Importar por nicho
            </button>
            <button onClick={openNewProc}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: ACCENT, border: "none", borderRadius: "8px", color: "#000", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
              <Plus size={14} /> Novo
            </button>
          </div>

          {procedimentos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ color: "#777068", marginBottom: "12px" }}>Nenhum procedimento cadastrado</p>
              <button onClick={() => { setNichoSel(null); setNichoModal(true); }}
                style={{ padding: "9px 20px", background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "8px", color: ACCENT, fontSize: "13px", cursor: "pointer" }}>
                Importar modelo por nicho
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {procedimentos.map((p) => (
                <div key={p.id} style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>{p.nome}</span>
                      <span style={{ fontSize: "10px", color: "#777068", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, padding: "1px 6px", borderRadius: "99px" }}>
                        {p.categoria === "avaliacao" ? "Avaliação" : p.categoria === "retorno" ? "Retorno" : "Ambos"}
                      </span>
                    </div>
                    {p.descricao && <p style={{ fontSize: "12px", color: "#9A9288" }}>{p.descricao}</p>}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => openEditProc(p)}
                      style={{ padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#9A9288", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => deleteProc(p.id)}
                      style={{ padding: "6px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Nicho ── */}
      {nichoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div style={{ width: "100%", maxWidth: "560px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "14px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>Importar por nicho</h3>
                <p style={{ fontSize: "12px", color: "#777068", marginTop: "3px" }}>Selecione o nicho da clínica para pré-carregar os procedimentos</p>
              </div>
              <button onClick={() => { setNichoModal(false); setNichoSel(null); }} style={{ background: "transparent", border: "none", color: "#777068", cursor: "pointer", display: "flex" }}><X size={18} /></button>
            </div>

            {/* Niche grid */}
            {!nichoSel ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "8px" }}>
                {NICHOS.map((n) => (
                  <button key={n.id} onClick={() => setNichoSel(n)}
                    style={{ padding: "18px 12px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "10px", cursor: "pointer", textAlign: "center", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,207,255,0.35)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}>
                    <p style={{ fontSize: "26px", marginBottom: "6px" }}>{n.emoji}</p>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>{n.label}</p>
                    <p style={{ fontSize: "11px", color: "#777068", marginTop: "3px" }}>{n.procs.length} opções</p>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <button onClick={() => setNichoSel(null)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: "#777068", cursor: "pointer", fontSize: "13px", marginBottom: "16px", padding: 0 }}>
                  <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} /> Voltar
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "22px" }}>{nichoSel.emoji}</span>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>{nichoSel.label}</p>
                    <p style={{ fontSize: "12px", color: "#777068" }}>{nichoSel.procs.length} procedimentos serão importados</p>
                  </div>
                </div>
                <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px" }}>
                  {nichoSel.procs.map((p, i) => {
                    const jaExiste = procedimentos.some((e) => e.nome.toLowerCase() === p.nome.toLowerCase());
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#0d0d0d", borderRadius: "7px", opacity: jaExiste ? 0.4 : 1 }}>
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", border: `1px solid ${BORDER}`, color: p.categoria === "avaliacao" ? "#F59E0B" : p.categoria === "retorno" ? "#8B5CF6" : "#777068", background: p.categoria === "avaliacao" ? "rgba(245,158,11,0.08)" : p.categoria === "retorno" ? "rgba(139,92,246,0.08)" : "transparent" }}>
                          {p.categoria === "avaliacao" ? "Avaliação" : p.categoria === "retorno" ? "Retorno" : "Ambos"}
                        </span>
                        <span style={{ fontSize: "13px", color: "#ccc", flex: 1 }}>{p.nome}</span>
                        {jaExiste && <span style={{ fontSize: "10px", color: "#555" }}>já existe</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => { setNichoModal(false); setNichoSel(null); }}
                    style={{ flex: 1, padding: "11px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", fontSize: "13px" }}>
                    Cancelar
                  </button>
                  <button onClick={importarNicho} disabled={importando}
                    style={{ flex: 2, padding: "11px", background: importando ? "#1a1a1a" : ACCENT, border: "none", borderRadius: "8px", color: importando ? "#444" : "#000", fontSize: "13px", fontWeight: "700", cursor: importando ? "not-allowed" : "pointer" }}>
                    {importando ? "Importando..." : `Importar ${nichoSel.procs.filter((p) => !procedimentos.some((e) => e.nome.toLowerCase() === p.nome.toLowerCase())).length} procedimentos`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Profissional ── */}
      {modal === "prof" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, padding: "16px", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: "580px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "14px", padding: "24px", margin: "24px 0" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{editId ? "Editar profissional" : "Novo profissional"}</h3>
              <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "#777068", cursor: "pointer", display: "flex" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* Foto */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  onClick={() => fotoRef.current?.click()}
                  style={{ width: "68px", height: "68px", borderRadius: "50%", background: "rgba(0,207,255,0.06)", border: `2px dashed rgba(0,207,255,0.25)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0 }}>
                  {pfFoto
                    ? <img src={pfFoto} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <><Camera size={18} color="rgba(0,207,255,0.5)" /><span style={{ fontSize: "9px", color: "rgba(0,207,255,0.5)", marginTop: "3px" }}>Foto</span></>
                  }
                </div>
                <div>
                  <button onClick={() => fotoRef.current?.click()}
                    style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "7px", color: "#ccc", fontSize: "12px", cursor: "pointer" }}>
                    Escolher foto
                  </button>
                  {pfFoto && (
                    <button onClick={() => setPfFoto(null)}
                      style={{ marginLeft: "8px", padding: "7px 10px", background: "transparent", border: "none", color: "#777068", fontSize: "12px", cursor: "pointer" }}>
                      Remover
                    </button>
                  )}
                  <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>JPG, PNG ou WebP</p>
                </div>
                <input ref={fotoRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display: "none" }} />
              </div>

              {/* Nome */}
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Nome *</label>
                <input value={pfNome} onChange={(e) => setPfNome(e.target.value)} placeholder="Dr. João Silva"
                  style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Acesso ao dashboard */}
              <div style={{ background: "rgba(0,207,255,0.03)", border: `1px solid rgba(0,207,255,0.12)`, borderRadius: "10px", padding: "14px" }}>
                <p style={{ fontSize: "12px", fontWeight: "600", color: ACCENT, marginBottom: "12px" }}>Acesso ao dashboard do profissional</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>E-mail de acesso</label>
                    <input type="email" value={pfEmail} onChange={(e) => setPfEmail(e.target.value)} placeholder="dr@clinica.com"
                      style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>
                      {editId ? "Nova senha (deixe em branco para manter)" : "Senha"}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showSenha ? "text" : "password"}
                        value={pfSenha}
                        onChange={(e) => setPfSenha(e.target.value)}
                        placeholder={editId ? "••••••••" : "Mínimo 6 caracteres"}
                        style={{ width: "100%", padding: "10px 40px 10px 12px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                      />
                      <button type="button" onClick={() => setShowSenha(!showSenha)}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "11px" }}>
                        {showSenha ? "ocultar" : "ver"}
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: "11px", color: "#555" }}>
                    O profissional acessa em <span style={{ color: ACCENT }}>/profissional/login</span> com esse e-mail e senha.
                  </p>
                </div>
              </div>

              {/* Especialidades - tag input */}
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Especialidades *</label>
                <div
                  onClick={() => document.getElementById("tag-input")?.focus()}
                  style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "8px 10px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", cursor: "text", minHeight: "42px", alignItems: "center" }}>
                  {pfTags.map((t) => (
                    <span key={t} style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,207,255,0.1)", border: `1px solid rgba(0,207,255,0.3)`, borderRadius: "99px", padding: "2px 10px", fontSize: "12px", color: ACCENT }}>
                      {t}
                      <button onClick={() => setPfTags(pfTags.filter((x) => x !== t))}
                        style={{ background: "transparent", border: "none", color: "rgba(0,207,255,0.6)", cursor: "pointer", display: "flex", padding: "0", lineHeight: 1 }}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    id="tag-input"
                    value={pfTagInput}
                    onChange={(e) => setPfTagInput(e.target.value)}
                    onKeyDown={handleTagKey}
                    placeholder={pfTags.length ? "" : "Digite e pressione Enter…"}
                    style={{ flex: 1, minWidth: "120px", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Enter ou vírgula para adicionar</p>
              </div>

              {/* Ativo toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setPfAtivo(!pfAtivo)}
                  style={{ width: "36px", height: "20px", borderRadius: "99px", background: pfAtivo ? ACCENT : "#333", border: "none", cursor: "pointer", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: "2px", left: pfAtivo ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.18s" }} />
                </button>
                <span style={{ fontSize: "13px", color: "#ccc" }}>{pfAtivo ? "Ativo" : "Inativo"}</span>
              </div>

              {/* Procedimentos */}
              {procedimentos.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", color: "#777068", marginBottom: "8px" }}>Procedimentos que atende</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {procedimentos.map((p) => {
                      const sel = pfProcIds.includes(p.id);
                      return (
                        <button key={p.id} onClick={() => toggleProcId(p.id)}
                          style={{ padding: "5px 12px", borderRadius: "99px", fontSize: "12px", cursor: "pointer", border: `1px solid ${sel ? "rgba(0,207,255,0.4)" : BORDER}`, background: sel ? "rgba(0,207,255,0.1)" : "transparent", color: sel ? ACCENT : "#9A9288", fontWeight: sel ? "600" : "400" }}>
                          {p.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Agenda semanal */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <p style={{ fontSize: "12px", color: "#777068" }}>Agenda semanal</p>
                  <button onClick={applyClinicSchedule}
                    style={{ padding: "5px 12px", background: "rgba(0,207,255,0.06)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "6px", color: ACCENT, fontSize: "11px", cursor: "pointer" }}>
                    Usar horário da clínica
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {pfDisp.map((d) => (
                    <div key={d.dia_semana}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: d.ativo ? "6px" : "0" }}>
                        <button onClick={() => toggleDia(d.dia_semana)}
                          style={{ minWidth: "40px", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", border: `1px solid ${d.ativo ? "rgba(0,207,255,0.4)" : BORDER}`, background: d.ativo ? "rgba(0,207,255,0.1)" : "#0d0d0d", color: d.ativo ? ACCENT : "#555" }}>
                          {DIAS_NOMES[d.dia_semana]}
                        </button>
                        {!d.ativo && <span style={{ fontSize: "11px", color: "#444" }}>Indisponível</span>}
                        {d.ativo && (
                          <button onClick={() => addRange(d.dia_semana)}
                            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#777068", fontSize: "11px", cursor: "pointer" }}>
                            <Plus size={10} /> Intervalo
                          </button>
                        )}
                      </div>

                      {d.ativo && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px", paddingLeft: "48px" }}>
                          {d.ranges.map((r, ri) => (
                            <div key={ri} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Clock size={11} color="#555" />
                              <input type="time" value={r.hora_inicio} onChange={(e) => updateRange(d.dia_semana, ri, "hora_inicio", e.target.value)}
                                style={{ padding: "4px 8px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#fff", fontSize: "12px", outline: "none" }} />
                              <span style={{ fontSize: "11px", color: "#555" }}>–</span>
                              <input type="time" value={r.hora_fim} onChange={(e) => updateRange(d.dia_semana, ri, "hora_fim", e.target.value)}
                                style={{ padding: "4px 8px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "6px", color: "#fff", fontSize: "12px", outline: "none" }} />
                              {d.ranges.length > 1 && (
                                <button onClick={() => removeRange(d.dia_semana, ri)}
                                  style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", display: "flex", padding: "2px" }}>
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: "11px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", fontSize: "13px" }}>
                Cancelar
              </button>
              <button onClick={saveProf} disabled={saving || !pfNome.trim() || pfTags.length === 0}
                style={{ flex: 2, padding: "11px", background: saving || !pfNome.trim() || pfTags.length === 0 ? "#1a1a1a" : ACCENT, border: "none", borderRadius: "8px", color: saving || !pfNome.trim() || pfTags.length === 0 ? "#444" : "#000", fontSize: "13px", fontWeight: "700", cursor: saving || !pfNome.trim() || pfTags.length === 0 ? "not-allowed" : "pointer" }}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Procedimento ── */}
      {modal === "proc" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div style={{ width: "100%", maxWidth: "420px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "14px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{editId ? "Editar procedimento" : "Novo procedimento"}</h3>
              <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", color: "#777068", cursor: "pointer", display: "flex" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Nome *</label>
                <input value={pcNome} onChange={(e) => setPcNome(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Descrição (opcional)</label>
                <input value={pcDesc} onChange={(e) => setPcDesc(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "8px" }}>Aparece em</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["avaliacao", "retorno", "ambos"] as const).map((c) => (
                    <button key={c} onClick={() => setPcCat(c)}
                      style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", border: `1px solid ${pcCat === c ? "rgba(0,207,255,0.4)" : BORDER}`, background: pcCat === c ? "rgba(0,207,255,0.1)" : "#0d0d0d", color: pcCat === c ? ACCENT : "#9A9288", fontWeight: pcCat === c ? "600" : "400" }}>
                      {c === "avaliacao" ? "Avaliação" : c === "retorno" ? "Retorno" : "Ambos"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "5px" }}>Ordem</label>
                <input type="number" value={pcOrdem} onChange={(e) => setPcOrdem(Number(e.target.value))}
                  style={{ width: "80px", padding: "10px 12px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: "11px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#9A9288", cursor: "pointer", fontSize: "13px" }}>
                Cancelar
              </button>
              <button onClick={saveProc} disabled={saving || !pcNome.trim()}
                style={{ flex: 2, padding: "11px", background: saving || !pcNome.trim() ? "#1a1a1a" : ACCENT, border: "none", borderRadius: "8px", color: saving || !pcNome.trim() ? "#444" : "#000", fontSize: "13px", fontWeight: "700", cursor: saving || !pcNome.trim() ? "not-allowed" : "pointer" }}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
