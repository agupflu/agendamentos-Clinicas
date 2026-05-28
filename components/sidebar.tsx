"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Users, ClipboardList, Settings, LogOut, Calendar, Stethoscope, LayoutDashboard } from "lucide-react";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.07)";

const NAV = [
  { label: "Início",        href: "/inicio",         icon: LayoutDashboard },
  { label: "Calendário",    href: "/calendario",     icon: CalendarDays },
  { label: "Agendamentos",  href: "/agendamentos",   icon: ClipboardList },
  { label: "Pacientes",     href: "/pacientes",      icon: Users },
  { label: "Profissionais", href: "/profissionais",  icon: Stethoscope },
  { label: "Configurações", href: "/configuracoes",  icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [clinicaNome, setClinicaNome] = useState("Clínica");
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => {
      if (d?.nome_clinica) setClinicaNome(d.nome_clinica);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function poll() {
      fetch("/api/agendamentos/pendentes")
        .then((r) => r.json())
        .then((d) => setPendentes(d.count ?? 0))
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside
        className={`cs-sidebar${mobileOpen ? " cs-sidebar-open" : ""}`}
        style={{ width: "220px", minWidth: "220px", background: "#080808", borderRight: `1px solid ${BORDER}`, height: "100vh", position: "fixed", top: 0, left: 0, display: "flex", flexDirection: "column", zIndex: 40 }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 20px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", background: "rgba(0,207,255,0.1)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} color={ACCENT} />
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#fff", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>{clinicaNome}</p>
              <p style={{ fontSize: "10px", color: "#777068", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "2px" }}>Sistema</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            const badge = label === "Agendamentos" && pendentes > 0;
            return (
              <Link key={href} href={href} onClick={onMobileClose}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "6px", textDecoration: "none", background: active ? "rgba(0,207,255,0.07)" : "transparent", borderLeft: `2px solid ${active ? ACCENT : "transparent"}`, transition: "background 0.15s" }}>
                <Icon size={15} color={active ? ACCENT : "#9A9288"} strokeWidth={active ? 2 : 1.5} />
                <span style={{ fontSize: "13px", fontWeight: active ? "600" : "400", color: active ? ACCENT : "#9A9288", flex: 1 }}>{label}</span>
                {badge && (
                  <span style={{ fontSize: "10px", fontWeight: "700", minWidth: "18px", height: "18px", background: "#F59E0B", color: "#000", borderRadius: "99px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {pendentes > 99 ? "99+" : pendentes}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 10px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: "4px" }}>
          <Link href="/agendar" target="_blank" onClick={onMobileClose}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "6px", textDecoration: "none", background: "rgba(0,207,255,0.04)", border: `1px solid rgba(0,207,255,0.12)` }}>
            <CalendarDays size={14} color={ACCENT} />
            <span style={{ fontSize: "12px", color: ACCENT, fontWeight: "500" }}>Página de agendamento</span>
          </Link>
          <button onClick={logout}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", width: "100%" }}>
            <LogOut size={14} color="#777068" />
            <span style={{ fontSize: "13px", color: "#777068" }}>Sair</span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .cs-sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .cs-sidebar-open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}
