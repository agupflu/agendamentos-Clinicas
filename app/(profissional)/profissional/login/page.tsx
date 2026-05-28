"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Lock, Mail } from "lucide-react";

const ACCENT = "#00CFFF";
const BORDER = "rgba(255,255,255,0.08)";

export default function ProfissionalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/profissional/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (r.ok) {
        router.push("/minha-agenda");
        router.refresh();
      } else {
        const d = await r.json();
        setErro(d.error ?? "Credenciais inválidas.");
      }
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ width: "56px", height: "56px", background: "rgba(0,207,255,0.08)", border: `1px solid rgba(0,207,255,0.2)`, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Calendar size={24} color={ACCENT} />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Minha Agenda</h1>
          <p style={{ fontSize: "13px", color: "#777068" }}>Acesso do profissional</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "6px" }}>E-mail</label>
            <div style={{ position: "relative" }}>
              <Mail size={15} color="#555" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="seu@email.com"
                style={{ width: "100%", padding: "12px 14px 12px 36px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "#777068", display: "block", marginBottom: "6px" }}>Senha</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} color="#555" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
                placeholder="••••••••"
                style={{ width: "100%", padding: "12px 14px 12px 36px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {erro && (
            <p style={{ fontSize: "13px", color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px" }}>
              {erro}
            </p>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: "13px", background: loading ? "#222" : ACCENT, border: "none", borderRadius: "8px", color: loading ? "#555" : "#000", fontSize: "14px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px" }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
