import { createAdminClient } from "@/lib/supabase";
import { CalendarDays, Users, Clock, CheckCircle, UserPlus, Stethoscope, AlertCircle, Plus, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/calendario";

export const dynamic = "force-dynamic";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";

async function getData() {
  const supabase = createAdminClient();
  const hoje = new Date().toISOString().split("T")[0];

  const mesInicio = new Date();
  mesInicio.setDate(1);
  const mesInicioStr = mesInicio.toISOString().split("T")[0];

  const semInicio = new Date();
  semInicio.setDate(semInicio.getDate() - semInicio.getDay());
  const semInicioStr = semInicio.toISOString().split("T")[0];

  const dias7: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias7.push(d.toISOString().split("T")[0]);
  }

  const [
    { count: totalPacientes },
    { data: agHoje },
    { count: pendentes },
    { count: concluidosHoje },
    { count: confirmados },
    { count: noShowMes },
    { count: totalMes },
    { count: pacientesNovos },
    { count: profAtivos },
    { data: agChart },
    { data: proximos },
  ] = await Promise.all([
    supabase.from("cs_pacientes").select("id", { count: "exact", head: true }),
    supabase.from("cs_agendamentos")
      .select("id, hora, status, paciente_id, profissional_id")
      .eq("data", hoje)
      .not("status", "in", '("cancelado","no_show")')
      .order("hora"),
    supabase.from("cs_agendamentos").select("id", { count: "exact", head: true })
      .eq("status", "pendente"),
    supabase.from("cs_agendamentos").select("id", { count: "exact", head: true })
      .eq("status", "concluido").eq("data", hoje),
    supabase.from("cs_agendamentos").select("id", { count: "exact", head: true })
      .eq("status", "confirmado"),
    supabase.from("cs_agendamentos").select("id", { count: "exact", head: true })
      .eq("status", "no_show").gte("data", mesInicioStr),
    supabase.from("cs_agendamentos").select("id", { count: "exact", head: true })
      .gte("data", mesInicioStr).not("status", "in", '("cancelado")'),
    supabase.from("cs_pacientes").select("id", { count: "exact", head: true })
      .gte("created_at", semInicioStr + "T00:00:00"),
    supabase.from("cs_profissionais").select("id", { count: "exact", head: true })
      .eq("ativo", true),
    supabase.from("cs_agendamentos").select("data, status")
      .gte("data", dias7[0]).lte("data", dias7[6])
      .not("status", "in", '("cancelado")'),
    supabase.from("cs_agendamentos")
      .select("id, data, hora, status, paciente_id")
      .gt("data", hoje)
      .not("status", "in", '("cancelado","no_show")')
      .order("data").order("hora").limit(5),
  ]);

  // Busca nomes dos pacientes para hoje e próximos
  const todosIds = [
    ...(agHoje ?? []).map((a: any) => a.paciente_id),
    ...(proximos ?? []).map((a: any) => a.paciente_id),
  ].filter(Boolean);
  const uniqIds = Array.from(new Set(todosIds));
  const { data: pacs } = uniqIds.length
    ? await supabase.from("cs_pacientes").select("id, nome").in("id", uniqIds)
    : { data: [] };
  const pacMap: Record<string, string> = Object.fromEntries((pacs ?? []).map((p: any) => [p.id, p.nome]));

  const taxaFalta = (totalMes ?? 0) > 0
    ? Math.round(((noShowMes ?? 0) / (totalMes ?? 1)) * 100)
    : 0;

  const chartData = dias7.map((day) => ({
    day,
    count: (agChart ?? []).filter((a: any) => a.data === day).length,
    label: new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }),
    isHoje: day === hoje,
  }));

  return {
    hoje,
    totalPacientes: totalPacientes ?? 0,
    agHoje: (agHoje ?? []).map((a: any) => ({ ...a, pacienteNome: pacMap[a.paciente_id] ?? "—" })),
    pendentes: pendentes ?? 0,
    concluidosHoje: concluidosHoje ?? 0,
    confirmados: confirmados ?? 0,
    pacientesNovos: pacientesNovos ?? 0,
    profAtivos: profAtivos ?? 0,
    taxaFalta,
    chartData,
    proximos: (proximos ?? []).map((a: any) => ({ ...a, pacienteNome: pacMap[a.paciente_id] ?? "—" })),
  };
}

function formatData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default async function InicioPage() {
  const {
    hoje, totalPacientes, agHoje, pendentes, concluidosHoje,
    confirmados, pacientesNovos, profAtivos, taxaFalta, chartData, proximos,
  } = await getData();

  const chartMax = Math.max(...chartData.map((d) => d.count), 1);

  const statCards = [
    { label: "Consultas hoje",    valor: agHoje.length,    cor: ACCENT,     icon: CalendarDays, href: "/calendario",    sub: "no dia" },
    { label: "Confirmadas",       valor: confirmados,      cor: "#10B981",  icon: CheckCircle,  href: "/agendamentos",  sub: "aguardando" },
    { label: "Concluídas hoje",   valor: concluidosHoje,   cor: "#A78BFA",  icon: TrendingUp,   href: "/agendamentos",  sub: "realizadas" },
    { label: "Pendentes",         valor: pendentes,        cor: "#F59E0B",  icon: Clock,        href: "/agendamentos",  sub: "sem confirmação" },
    { label: "Pacientes novos",   valor: pacientesNovos,   cor: "#34D399",  icon: UserPlus,     href: "/pacientes",     sub: "esta semana" },
    { label: "Profissionais",     valor: profAtivos,       cor: "#60A5FA",  icon: Stethoscope,  href: "/profissionais", sub: "ativos" },
    { label: "Total de pacientes",valor: totalPacientes,   cor: "#C084FC",  icon: Users,        href: "/pacientes",     sub: "cadastrados" },
    { label: "Taxa de faltas",    valor: `${taxaFalta}%`,  cor: taxaFalta > 20 ? "#EF4444" : "#777068", icon: AlertCircle, href: "/agendamentos", sub: "este mês" },
  ];

  return (
    <div style={{ padding: "28px 28px 40px", flex: 1, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>Visão geral</h1>
          <p style={{ fontSize: "13px", color: "#777068" }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/agendamentos" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: ACCENT, borderRadius: "8px", color: "#000", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
          <Plus size={14} /> Novo agendamento
        </Link>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px", marginBottom: "24px" }}>
        {statCards.map(({ label, valor, cor, icon: Icon, href, sub }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px 18px", transition: "border-color 0.15s", cursor: "pointer", height: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <p style={{ fontSize: "11px", color: "#777068", lineHeight: 1.3 }}>{label}</p>
                <div style={{ width: "28px", height: "28px", background: `${cor}15`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} color={cor} />
                </div>
              </div>
              <p style={{ fontSize: "28px", fontWeight: "700", color: cor, lineHeight: 1 }}>{valor}</p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Gráfico + Ações rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "16px", marginBottom: "20px" }}>

        {/* Gráfico 7 dias */}
        <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>Consultas — últimos 7 dias</p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>exceto canceladas</p>
            </div>
            <Link href="/agendamentos" style={{ fontSize: "12px", color: ACCENT, textDecoration: "none" }}>Ver todos →</Link>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px" }}>
            {chartData.map(({ day, count, label, isHoje }) => (
              <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                  {count > 0 && (
                    <span style={{ fontSize: "10px", color: isHoje ? ACCENT : "#777068", fontWeight: "600", marginBottom: "3px" }}>{count}</span>
                  )}
                  <div style={{
                    width: "100%",
                    height: count === 0 ? "3px" : `${Math.max((count / chartMax) * 100, 8)}%`,
                    background: isHoje ? ACCENT : "rgba(255,255,255,0.1)",
                    borderRadius: "4px 4px 0 0",
                    border: isHoje ? `1px solid ${ACCENT}40` : "none",
                    transition: "height 0.3s",
                    minHeight: "3px",
                  }} />
                </div>
                <span style={{ fontSize: "10px", color: isHoje ? ACCENT : "#555", textTransform: "capitalize", fontWeight: isHoje ? "700" : "400" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ações rápidas */}
        <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#fff", marginBottom: "16px" }}>Ações rápidas</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "Novo agendamento", href: "/agendamentos", icon: Plus,         cor: ACCENT,    bg: "rgba(0,207,255,0.08)",   border: "rgba(0,207,255,0.2)" },
              { label: "Calendário",       href: "/calendario",   icon: CalendarDays, cor: "#10B981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)" },
              { label: "Ver pacientes",    href: "/pacientes",    icon: Users,        cor: "#A78BFA", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.2)" },
              { label: "Configurações",    href: "/configuracoes",icon: ArrowRight,   cor: "#777068", bg: "transparent",           border: BORDER },
            ].map(({ label, href, icon: Icon, cor, bg, border }) => (
              <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", background: bg, border: `1px solid ${border}`, borderRadius: "9px", textDecoration: "none", transition: "opacity 0.15s" }}>
                <div style={{ width: "26px", height: "26px", background: `${cor}15`, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} color={cor} />
                </div>
                <span style={{ fontSize: "13px", color: cor === "#777068" ? "#9A9288" : "#fff", fontWeight: "500", flex: 1 }}>{label}</span>
                <ArrowRight size={12} color="#444" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hoje + Próximas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Hoje */}
        <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>Agenda de hoje</p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{agHoje.length} consulta{agHoje.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href="/calendario" style={{ fontSize: "12px", color: ACCENT, textDecoration: "none" }}>Calendário →</Link>
          </div>
          {agHoje.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#555" }}>
              <CalendarDays size={28} style={{ margin: "0 auto 8px", opacity: 0.25 }} />
              <p style={{ fontSize: "13px" }}>Nenhuma consulta hoje</p>
            </div>
          ) : (
            <div>
              {agHoje.slice(0, 6).map((ag: any) => {
                const cor = STATUS_COLORS[ag.status as keyof typeof STATUS_COLORS] ?? "#777";
                return (
                  <div key={ag.id} style={{ padding: "11px 20px", borderBottom: `1px solid rgba(255,255,255,0.04)`, display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "3px", height: "32px", background: cor, borderRadius: "99px", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: "500", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ag.pacienteNome}</p>
                      <p style={{ fontSize: "11px", color: "#777068" }}>{ag.hora}</p>
                    </div>
                    <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: `${cor}18`, color: cor, border: `1px solid ${cor}30`, flexShrink: 0 }}>
                      {STATUS_LABELS[ag.status as keyof typeof STATUS_LABELS]}
                    </span>
                  </div>
                );
              })}
              {agHoje.length > 6 && (
                <div style={{ padding: "10px 20px", textAlign: "center" }}>
                  <Link href="/calendario" style={{ fontSize: "12px", color: "#555", textDecoration: "none" }}>+ {agHoje.length - 6} mais</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Próximas */}
        <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>Próximas consultas</p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>dias seguintes</p>
            </div>
            <Link href="/agendamentos" style={{ fontSize: "12px", color: ACCENT, textDecoration: "none" }}>Ver todas →</Link>
          </div>
          {proximos.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#555" }}>
              <Clock size={28} style={{ margin: "0 auto 8px", opacity: 0.25 }} />
              <p style={{ fontSize: "13px" }}>Nenhuma consulta futura</p>
            </div>
          ) : (
            <div>
              {proximos.map((ag: any) => (
                <div key={ag.id} style={{ padding: "11px 20px", borderBottom: `1px solid rgba(255,255,255,0.04)`, display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ textAlign: "center", minWidth: "36px" }}>
                    <p style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{ag.data.split("-")[2]}</p>
                    <p style={{ fontSize: "9px", color: "#555", textTransform: "uppercase" }}>
                      {new Date(ag.data + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                    </p>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ag.pacienteNome}</p>
                    <p style={{ fontSize: "11px", color: "#777068" }}>{ag.hora}</p>
                  </div>
                  <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: `${STATUS_COLORS[ag.status as keyof typeof STATUS_COLORS] ?? "#777"}18`, color: STATUS_COLORS[ag.status as keyof typeof STATUS_COLORS] ?? "#777", border: `1px solid ${STATUS_COLORS[ag.status as keyof typeof STATUS_COLORS] ?? "#777"}30`, flexShrink: 0 }}>
                    {STATUS_LABELS[ag.status as keyof typeof STATUS_LABELS]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
