-- ============================================================
-- CLINICA SISTEMA — Schema completo
-- Prefixo cs_ para não conflitar com outras tabelas
-- ============================================================

-- Config geral da clínica
CREATE TABLE IF NOT EXISTS cs_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_clinica text NOT NULL DEFAULT 'Minha Clínica',
  especialidade text DEFAULT 'Saúde & Bem-estar',
  descricao text DEFAULT 'Agende sua consulta em segundos.',
  cor_primaria text DEFAULT '#00CFFF',
  telefone text,
  endereco text,
  duracao_consulta integer DEFAULT 30,
  intervalo_entre integer DEFAULT 0,
  dias_antecedencia integer DEFAULT 30,
  webhook_url text,
  webhook_ativo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO cs_config (nome_clinica, especialidade, descricao)
VALUES ('Clínica Demo', 'Saúde & Bem-estar', 'Agende sua consulta em segundos, sem ligação.')
ON CONFLICT DO NOTHING;

-- Perguntas do quiz
CREATE TABLE IF NOT EXISTS cs_quiz_perguntas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem integer NOT NULL DEFAULT 0,
  pergunta text NOT NULL,
  tipo text NOT NULL DEFAULT 'single_choice',
  opcoes jsonb,
  obrigatoria boolean DEFAULT true,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO cs_quiz_perguntas (ordem, pergunta, tipo, opcoes) VALUES
  (1, 'Qual é o motivo da sua consulta?', 'single_choice', '["Consulta de rotina", "Sintoma específico", "Retorno", "Procedimento estético", "Outro"]'),
  (2, 'Você já foi atendido aqui antes?', 'single_choice', '["Sim, sou paciente", "Não, primeira vez"]'),
  (3, 'Qual período prefere?', 'single_choice', '["Manhã (8h–12h)", "Tarde (13h–17h)", "Qualquer horário"]')
ON CONFLICT DO NOTHING;

-- Disponibilidade recorrente por dia da semana
CREATE TABLE IF NOT EXISTS cs_disponibilidade (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dia_semana integer NOT NULL, -- 0=Dom 1=Seg ... 6=Sáb
  hora_inicio text NOT NULL DEFAULT '09:00',
  hora_fim text NOT NULL DEFAULT '18:00',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO cs_disponibilidade (dia_semana, hora_inicio, hora_fim, ativo) VALUES
  (0, '09:00', '12:00', false),
  (1, '09:00', '18:00', true),
  (2, '09:00', '18:00', true),
  (3, '09:00', '18:00', true),
  (4, '09:00', '18:00', true),
  (5, '09:00', '18:00', true),
  (6, '09:00', '13:00', true)
ON CONFLICT DO NOTHING;

-- Bloqueios manuais (datas específicas ou faixas de hora)
CREATE TABLE IF NOT EXISTS cs_bloqueios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  hora_inicio text,  -- null = dia inteiro bloqueado
  hora_fim text,
  motivo text,
  created_at timestamptz DEFAULT now()
);

-- Pacientes (CRM)
CREATE TABLE IF NOT EXISTS cs_pacientes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  data_nascimento date,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notas do paciente
CREATE TABLE IF NOT EXISTS cs_notas_paciente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid REFERENCES cs_pacientes(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS cs_agendamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid REFERENCES cs_pacientes(id) ON DELETE SET NULL,
  data date NOT NULL,
  hora text NOT NULL,
  hora_fim text,
  status text NOT NULL DEFAULT 'pendente',
  procedimento text,
  quiz_respostas jsonb,
  observacoes text,
  origem text DEFAULT 'online', -- online | manual
  webhook_enviado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fila de webhooks
CREATE TABLE IF NOT EXISTS cs_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id uuid REFERENCES cs_agendamentos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'pendente',
  tentativas integer DEFAULT 0,
  erro text,
  created_at timestamptz DEFAULT now(),
  processado_at timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cs_agendamentos_data ON cs_agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_cs_agendamentos_status ON cs_agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_cs_agendamentos_paciente ON cs_agendamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_cs_bloqueios_data ON cs_bloqueios(data);
CREATE INDEX IF NOT EXISTS idx_cs_pacientes_telefone ON cs_pacientes(telefone);

-- Sem RLS (uso via service_role)
ALTER TABLE cs_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_quiz_perguntas DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_disponibilidade DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_bloqueios DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_notas_paciente DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_webhook_events DISABLE ROW LEVEL SECURITY;
