# Prompt — Módulo de Metas ANK Data

Use este prompt no Claude Code (VSCode) para implementar o módulo completo de metas.

---

## Contexto do projeto

Você está trabalhando no **ANK Data SaaS** — plataforma React + Vite + TypeScript + Tailwind + Supabase
para gestão de franquias do Grupo Boticário. O projeto está em `ank-data-saas/`.

Leia antes de qualquer coisa:
- `src/types/index.ts` — tipos globais (UserRole, Profile, Tenant, etc.)
- `src/lib/supabaseClient.ts` — cliente Supabase
- `src/services/lojas.service.ts` — padrão de service usado no projeto
- `src/pages/franqueado/LojasPage.tsx` — padrão de página com tabela + modal
- `src/components/ui/` — componentes Card, Button, Input, Modal, Spinner disponíveis

---

## O que construir

### Módulo: Gestão de Metas (`/franqueado/metas`)

O franqueado do Boticário precisa registrar e acompanhar metas por PDV, ciclo e marca.
As metas podem entrar no sistema por **upload de planilha Excel** ou por **criação manual**.

---

## Calendário Boticário

O Boticário usa 17 ciclos por ano (cada ~3 semanas). Mapeamento fixo ciclo → mês:

```typescript
export const CICLO_MES: Record<number, number> = {
  1: 1,  2: 1,  3: 2,  4: 3,  5: 3,  6: 4,
  7: 5,  8: 5,  9: 6,  10: 7, 11: 7, 12: 8,
  13: 9, 14: 9, 15: 10, 16: 11, 17: 12,
}

// ciclo_key = YYYYCC (ex: "202510" = ano 2025, ciclo 10)
export function cicloKey(ano: number, ciclo: number): string {
  return `${ano}${String(ciclo).padStart(2, '0')}`
}
```

---

## Schema do banco (já deve existir ou criar migration)

```sql
CREATE TABLE IF NOT EXISTS public.metas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

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
  importado_por    uuid REFERENCES profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),

  UNIQUE (tenant_id, ano, ciclo, cod_pdv, canal, marca)
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_tenant_isolado" ON public.metas
  USING (tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "metas_tenant_insert" ON public.metas FOR INSERT
  WITH CHECK (tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "metas_tenant_update" ON public.metas FOR UPDATE
  USING (tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));
```

---

## Arquivos a criar

### 1. `src/services/metas.service.ts`

Service com as operações:
- `list(tenantId, filters)` — filtra por ano, ciclo, mes, canal, marca, cod_pdv
- `upsert(tenantId, rows)` — insert ou update (usado no upload e na edição)
- `remove(id)` — deleta uma meta

### 2. `src/pages/franqueado/MetasPage.tsx`

Página principal com:

**Filtros no topo:**
- Seletor de Ano (dropdown com anos disponíveis + ano atual como default)
- Seletor de Ciclo (1–17, "Todos")
- Seletor de Mês (1–12 por nome, "Todos") — quando ciclo for selecionado, mês é derivado automaticamente
- Seletor de Canal (LOJA / VD / Todos)
- Seletor de Marca (BOT / OUI / QDB / EUD / Todos)
- Campo de busca por Cod. PDV

**Ações no header:**
- Botão "+ Nova Meta" → abre `MetaFormModal`
- Botão "↑ Importar Excel" → abre `MetaImportModal`
- Botão "↓ Exportar" → exporta tabela filtrada como CSV

**Tabela de metas:**
Colunas: Ciclo | Mês | Canal | Marca | PDV | GMV | RPA | Ativas | Ativas GB | Penetração | Boletos | Boleto Médio | Fonte | Ações

- Cada linha tem botão de editar (abre modal) e deletar
- Badge de fonte: "upload" (cinza) ou "manual" (âmbar)
- Paginação: 50 registros por página

**Cards de resumo no topo (visão atual do filtro):**
- Total de PDVs com meta
- GMV total previsto
- RPA médio
- Penetração média

### 3. `src/pages/franqueado/MetaFormModal.tsx`

Modal de criação/edição com campos:
- Ano* (number input, default ano atual)
- Ciclo* (select 1–17, ao selecionar preenche Mês automaticamente)
- Mês (read-only, derivado do ciclo via CICLO_MES)
- Canal* (LOJA / VD)
- Cod. PDV*
- Cod. CP*
- Nome CP
- Marca* (BOT / OUI / QDB / EUD)
- GMV, RPA, Base Total, Atividade Total (numeric inputs)
- Ativas Totais, Ativas Totais GB (integer inputs)
- Penetração (%) 
- Número de Boletos, Boleto Médio

### 4. `src/pages/franqueado/MetaImportModal.tsx`

Modal de importação com duas etapas:

**Etapa 1 — Upload:**
- Zona drag & drop (.xlsx, .xls, .csv)
- Ao soltar o arquivo, lê os headers com SheetJS
- Detecta automaticamente o tipo de planilha:
  - **Tipo A** (tem coluna "RPA"): planilha completa de KPIs
  - **Tipo B** (tem coluna "Mês" e "GMV" mas não "RPA"): consolidado por Mês
  - **Tipo C** (tem "Número de Boletos"): planilha de boletos
- Exibe preview das primeiras 5 linhas

**Etapa 2 — Mapeamento e Confirmação:**
- Mostra mapeamento detectado: coluna do arquivo → campo da meta
- Campo "Ano" (se não estiver no arquivo)
- Total de linhas a importar
- Botão "Confirmar Importação" → chama `MetasService.upsert()` em batch

**Regras de importação:**
- Coluna `Ciclo` no formato `YYYYCC` → extrair ano e ciclo (ex: `202510` → ano=2025, ciclo=10)
- Coluna `Ciclo` apenas com número (1–17) → usar o campo Ano definido pelo usuário
- Derivar `mes` automaticamente via `CICLO_MES[ciclo]`
- Valores monetários como string ("R$ 1.234,56") → converter para number
- Conflito (mesmo PDV+ciclo+canal+marca) → UPSERT (atualizar)

---

## Padrões do projeto a seguir

**Service pattern:**
```typescript
export const MetasService = {
  list: (tenantId: string, filters: MetaFilters) =>
    supabase.from('metas').select('*')
      .eq('tenant_id', tenantId)
      // aplicar filtros opcionais
      .order('ciclo_key', { ascending: false }),

  upsert: (rows: MetaUpsertData[]) =>
    supabase.from('metas').upsert(rows, {
      onConflict: 'tenant_id,ano,ciclo,cod_pdv,canal,marca'
    }),

  remove: (id: string) =>
    supabase.from('metas').delete().eq('id', id),
}
```

**Tipagem:**
```typescript
export interface Meta {
  id: string
  tenant_id: string
  ano: number
  ciclo: number
  mes: number
  ciclo_key: string   // gerado pelo banco
  cod_pdv: string
  cod_cp: string
  nome_cp: string | null
  canal: 'LOJA' | 'VD'
  marca: string
  gmv: number | null
  rpa: number | null
  base_total: number | null
  atividade_total: number | null
  ativas_totais: number | null
  ativas_totais_gb: number | null
  penetracao: number | null
  numero_boletos: number | null
  boleto_medio: number | null
  fonte: 'upload' | 'manual'
  importado_por: string | null
  created_at: string
  updated_at: string
}

export interface MetaFilters {
  ano?: number
  ciclo?: number
  mes?: number
  canal?: 'LOJA' | 'VD'
  marca?: string
  cod_pdv?: string
}
```

---

## Integração no router e sidebar

**Adicionar em `src/router/AppRouter.tsx`:**
```tsx
import MetasPage from '../pages/franqueado/MetasPage'
// dentro do FranchiseRoute:
<Route path="metas" element={<MetasPage />} />
```

**Adicionar em `src/components/franqueado/FranchiseSidebar.tsx`:**
```tsx
import { FlagIcon } from '@heroicons/react/24/outline'
// no array BASE_MODULES:
{ to: '/franqueado/metas', slug: 'metas', label: 'Metas', icon: FlagIcon }
```

**Adicionar em `scripts/migrate-schema-v3.sql`** (ou criar v4):
A migration SQL completa da tabela `metas` com RLS.

---

## Ordem de implementação sugerida

1. `src/types/index.ts` — adicionar tipo `Meta`, `MetaFilters`, `CICLO_MES`
2. `scripts/migrate-metas.sql` — migration do banco
3. `src/services/metas.service.ts` — service
4. `src/pages/franqueado/MetaFormModal.tsx` — modal de criação/edição
5. `src/pages/franqueado/MetaImportModal.tsx` — modal de importação
6. `src/pages/franqueado/MetasPage.tsx` — página principal
7. Integrar no router e sidebar
8. Adicionar módulo `metas` na tabela `modulos` do Supabase

---

## Exemplos de dados reais para testar

```
Ciclo 202510 → ano=2025, ciclo=10, mes=7 (Julho)
Ciclo 202501 → ano=2025, ciclo=1,  mes=1 (Janeiro)
Ciclo 202617 → ano=2026, ciclo=17, mes=12 (Dezembro)
```

Marcas: `BOT` (Boticário), `EUD` (Eudora), `OUI` (O.U.I), `QDB` (Quem Disse Berenice)
Canais: `LOJA` (varejo físico), `VD` (venda direta)
