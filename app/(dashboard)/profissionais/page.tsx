import ProfissionaisView from "@/components/crm/profissionais-view";

export const dynamic = "force-dynamic";

export default function ProfissionaisPage() {
  return (
    <div style={{ padding: "24px", flex: 1 }}>
      <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "24px" }}>Profissionais</h1>
      <ProfissionaisView />
    </div>
  );
}
