-- ═══════════════════════════════════════════════════════════════════════
-- ANK Data — Migração V2: RBAC por Módulo + Campos Adicionais
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Novos campos em tenants ──────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS codigo_cp  varchar(50),
  ADD COLUMN IF NOT EXISTS ativo      boolean NOT NULL DEFAULT true;

-- ── 2. Novo campo em licenses ───────────────────────────────────────────
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS valor_contrato  numeric(10,2),
  ADD COLUMN IF NOT EXISTS meses_contrato  smallint;

-- ── 3. Tabela de módulos (caso não exista) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.modulos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_modulo text NOT NULL UNIQUE,
  nome        text NOT NULL,
  descricao   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Tabela de permissões por papel (caso não exista) ─────────────────
CREATE TABLE IF NOT EXISTS public.permissoes_papel (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  papel       text NOT NULL,
  slug_modulo text NOT NULL REFERENCES public.modulos(slug_modulo) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (papel, slug_modulo)
);

-- ── 5. Seed: módulos do sistema ─────────────────────────────────────────
INSERT INTO public.modulos (slug_modulo, nome, descricao) VALUES
  ('dashboard',   'Dashboard',            'Visão geral de KPIs'),
  ('upload',      'Upload de Arquivos',   'Envio de arquivos de vendas'),
  ('vendas',      'Análise de Vendas',    'Sell-out e giro de estoque'),
  ('estoque',     'Gestão de Estoque',    'Alertas de ruptura e estoque parado'),
  ('financeiro',  'Controle Financeiro',  'Margens, descontos e precificação'),
  ('crm',         'CRM e Retenção',       'Clube fidelidade e reativação'),
  ('relatorios',  'Relatórios',           'Exportações e relatórios gerenciais')
ON CONFLICT (slug_modulo) DO NOTHING;

-- ── 6. Seed: permissões por papel ───────────────────────────────────────
-- Gerente: acesso completo ao painel franqueado
INSERT INTO public.permissoes_papel (papel, slug_modulo)
SELECT 'gerente', slug_modulo FROM public.modulos
ON CONFLICT DO NOTHING;

-- Vendedor: apenas dashboard, upload e vendas
INSERT INTO public.permissoes_papel (papel, slug_modulo) VALUES
  ('vendedor', 'dashboard'),
  ('vendedor', 'upload'),
  ('vendedor', 'vendas')
ON CONFLICT DO NOTHING;

-- Controller Financeiro: dashboard, financeiro e relatórios
INSERT INTO public.permissoes_papel (papel, slug_modulo) VALUES
  ('controller_financeiro', 'dashboard'),
  ('controller_financeiro', 'financeiro'),
  ('controller_financeiro', 'relatorios')
ON CONFLICT DO NOTHING;

-- ── 7. RLS: Admin ANK pode ler/escrever todos os perfis ─────────────────

-- SELECT: admin vê todos os perfis
DROP POLICY IF EXISTS "ank_admin_select_all_profiles" ON public.profiles;
CREATE POLICY "ank_admin_select_all_profiles"
ON public.profiles FOR SELECT
USING (
  (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'ank_admin'
);

-- UPDATE: admin atualiza qualquer perfil
DROP POLICY IF EXISTS "ank_admin_update_all_profiles" ON public.profiles;
CREATE POLICY "ank_admin_update_all_profiles"
ON public.profiles FOR UPDATE
USING (
  (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'ank_admin'
);

-- INSERT: admin cria perfis para novos usuários
DROP POLICY IF EXISTS "ank_admin_insert_profiles" ON public.profiles;
CREATE POLICY "ank_admin_insert_profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'ank_admin'
);

-- ── 8. RLS: permissoes_papel e modulos são públicas para leitura ────────
ALTER TABLE public.modulos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_papel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modulos_public_read"          ON public.modulos;
DROP POLICY IF EXISTS "permissoes_papel_public_read" ON public.permissoes_papel;

CREATE POLICY "modulos_public_read"
ON public.modulos FOR SELECT USING (true);

CREATE POLICY "permissoes_papel_public_read"
ON public.permissoes_papel FOR SELECT USING (true);

-- ── 9. Verificação ──────────────────────────────────────────────────────
SELECT 'modulos'          AS tabela, count(*) FROM public.modulos
UNION ALL
SELECT 'permissoes_papel' AS tabela, count(*) FROM public.permissoes_papel;
