"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { formatarDataExtenso } from "@/lib/calendario";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";

function Content() {
  const p = useSearchParams();
  const nome = p.get("nome") ?? "";
  const data = p.get("data") ?? "";
  const hora = p.get("hora") ?? "";
  const clinica = p.get("clinica") ?? "Clínica";

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "68px", height: "68px", background: "rgba(0,207,255,0.08)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle size={32} color={ACCENT} />
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>Agendado!</h1>
        <p style={{ fontSize: "14px", color: "#9A9288", marginBottom: "28px" }}>{nome ? `${nome}, seu ` : "Seu "}agendamento foi confirmado na {clinica}.</p>
        <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "20px", marginBottom: "20px", textAlign: "left" }}>
          {data && <Row icon={<Calendar size={15} color={ACCENT} />} label="Data" value={formatarDataExtenso(data)} />}
          {hora && <Row icon={<Clock size={15} color={ACCENT} />} label="Horário" value={hora} last />}
        </div>
        <Link href="/agendar" style={{ display: "inline-block", padding: "11px 24px", background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "8px", color: ACCENT, fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
          Novo agendamento
        </Link>
      </div>
    </div>
  );
}

function Row({ icon, label, value, last = false }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: last ? 0 : "14px" }}>
      {icon}
      <div><p style={{ fontSize: "11px", color: "#777068" }}>{label}</p><p style={{ fontSize: "13px", color: "#fff", fontWeight: "500", textTransform: "capitalize" }}>{value}</p></div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080808" }} />}><Content /></Suspense>;
}
