export function gerarSlots(inicio: string, fim: string, duracao: number, intervalo = 0): string[] {
  const slots: string[] = [];
  const [hI, mI] = inicio.split(":").map(Number);
  const [hF, mF] = fim.split(":").map(Number);
  let min = hI * 60 + mI;
  const fimMin = hF * 60 + mF;
  while (min + duracao <= fimMin) {
    slots.push(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
    min += duracao + intervalo;
  }
  return slots;
}

export function somarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function semanaAtual(dataRef?: Date): Date[] {
  const hoje = dataRef ?? new Date();
  const diaSemana = hoje.getDay();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - diaSemana);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

export function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataExtenso(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

export const DIAS_NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_COMPLETOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente", confirmado: "Confirmado", cancelado: "Cancelado",
  concluido: "Concluído", no_show: "Não compareceu",
};

export const STATUS_COLORS: Record<string, string> = {
  pendente: "#F59E0B", confirmado: "#10B981", cancelado: "#EF4444",
  concluido: "#6B7280", no_show: "#8B5CF6",
};
