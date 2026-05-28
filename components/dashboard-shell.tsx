"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/sidebar";

const BORDER = "rgba(255,255,255,0.07)";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080808" }}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 39 }}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <main style={{ marginLeft: "220px", flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" }}>
        {/* Mobile top bar */}
        <div className="cs-mobile-header" style={{ display: "none", alignItems: "center", gap: "12px", padding: "12px 16px", background: "#080808", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 38 }}>
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Menu size={20} color="#9A9288" />
          </button>
          <p style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>Sistema</p>
        </div>

        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .cs-mobile-header { display: flex !important; }
          main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
