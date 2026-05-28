export interface CsConfig {
  id: string;
  nome_clinica: string;
  especialidade: string;
  descricao: string;
  cor_primaria: string;
  telefone: string | null;
  endereco: string | null;
  duracao_consulta: number;
  intervalo_entre: number;
  dias_antecedencia: number;
  webhook_url: string | null;
  webhook_ativo: boolean;
  whatsapp_template: string | null;
  created_at: string;
  updated_at: string;
}

export interface CsQuizPergunta {
  id: string;
  ordem: number;
  pergunta: string;
  tipo: "single_choice" | "text" | "boolean";
  opcoes: string[] | null;
  obrigatoria: boolean;
  ativo: boolean;
  created_at: string;
}

export interface CsDisponibilidade {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
  created_at: string;
}

export interface CsBloqueio {
  id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string | null;
  created_at: string;
}

export interface CsProcedimento {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: "avaliacao" | "retorno" | "ambos";
  duracao_override: number | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface CsProfissionalDisponibilidade {
  id: string;
  profissional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
}

export interface CsProfissional {
  id: string;
  nome: string;
  especialidade: string;
  bio: string | null;
  foto_url: string | null;
  email: string | null;
  senha: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  disponibilidade?: CsProfissionalDisponibilidade[];
  procedimentos?: CsProcedimento[];
}

export interface CsPaciente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  agendamentos?: CsAgendamento[];
  notas?: CsNotaPaciente[];
}

export interface CsNotaPaciente {
  id: string;
  paciente_id: string;
  conteudo: string;
  created_at: string;
}

export type CsAgendamentoStatus = "pendente" | "confirmado" | "cancelado" | "concluido" | "no_show";

export interface CsAgendamento {
  id: string;
  paciente_id: string | null;
  profissional_id: string | null;
  data: string;
  hora: string;
  hora_fim: string | null;
  status: CsAgendamentoStatus;
  tipo_agendamento: "avaliacao" | "retorno" | null;
  procedimento: string | null;
  procedimento_id: string | null;
  sintoma_relatado: string | null;
  procedimento_indicado: string | null;
  quiz_respostas: Record<string, string> | null;
  observacoes: string | null;
  origem: "online" | "manual";
  webhook_enviado: boolean;
  created_at: string;
  updated_at: string;
  paciente?: CsPaciente;
  profissional?: CsProfissional;
}

export interface NovoAgendamentoInput {
  paciente: { nome: string; telefone: string; email?: string };
  data: string;
  hora: string;
  profissional_id?: string;
  tipo_agendamento?: "avaliacao" | "retorno";
  procedimento_id?: string;
  procedimento?: string;
  sintoma_relatado?: string;
  quiz_respostas: Record<string, string>;
  origem?: "online" | "manual";
}
