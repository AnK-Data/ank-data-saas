-- ─── Módulo de Metas — Migration v4 ──────────────────────────────────────────
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.metas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Temporal
  ano              smallint NOT NULL,
  ciclo            smallint NOT NULL CHECK (ciclo BETWEEN 1 AND 17),
  mes              smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ciclo_key        text GENERATED ALWAYS AS (
                     ano::text || LPAD(ciclo::text, 2, '0')
                   ) STORED,

  -- Estrutural
  cod_pdv          text NOT NULL,
  cod_cp           text NOT NULL,
  nome_cp          text,
  canal            text NOT NULL CHECK (canal IN ('LOJA', 'VD')),
  marca            text NOT NULL,

  -- KPIs
  gmv              numeric(14,2),
  rpa              numeric(10,2),
  base_total       numeric(10,2),
  atividade_total  numeric(10,2),
  ativas_totais    integer,
  ativas_totais_gb integer,
  penetracao       numeric(5,2),
  numero_boletos   integer,
  boleto_medio     numeric(10,2),

  -- Controle
  fonte            text DEFAULT 'upload' CHECK (fonte IN ('upload', 'manual')),
  importado_por    uuid REFERENCES public.profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),

  UNIQUE (tenant_id, ano, ciclo, cod_pdv, canal, marca)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_metas_tenant_ciclo   ON public.metas (tenant_id, ciclo_key DESC);
CREATE INDEX IF NOT EXISTS idx_metas_tenant_pdv     ON public.metas (tenant_id, cod_pdv);
CREATE INDEX IF NOT EXISTS idx_metas_tenant_canal   ON public.metas (tenant_id, canal);
CREATE INDEX IF NOT EXISTS idx_metas_tenant_marca   ON public.metas (tenant_id, marca);

-- RLS
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_select" ON public.metas FOR SELECT TO authenticated
  USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "metas_insert" ON public.metas FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "metas_update" ON public.metas FOR UPDATE TO authenticated
  USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "metas_delete" ON public.metas FOR DELETE TO authenticated
  USING (tenant_id = public.get_auth_tenant_id());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE TRIGGER metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Adicionar slug 'metas' ao catálogo de módulos (se tabela existir)
INSERT INTO public.modulos (slug_modulo, nome, descricao)
VALUES ('metas', 'Gestão de Metas', 'Registro e acompanhamento de metas por PDV, ciclo e marca')
ON CONFLICT (slug_modulo) DO NOTHING;

NOTIFY pgrst, 'reload schema';
