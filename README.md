# ANK Data Insights — Plataforma SaaS Multi-Tenant

> **Inteligência de dados para o varejo de cosméticos do Grupo Boticário**
> Plataforma White Label que transforma arquivos de venda em insights acionáveis para franquias.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Tech Stack](#tech-stack)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Configuração e Setup](#configuração-e-setup)
5. [Banco de Dados](#banco-de-dados)
6. [Autenticação e RBAC](#autenticação-e-rbac)
7. [Painel Admin ROOT](#painel-admin-root)
8. [Painel Franqueado](#painel-franqueado)
9. [White Label Dinâmico](#white-label-dinâmico)
10. [Upload e Validação de Arquivos](#upload-e-validação-de-arquivos)
11. [Controle de Licenças](#controle-de-licenças)
12. [Scripts Utilitários](#scripts-utilitários)
13. [Referência de Specs](#referência-de-specs)
14. [Roadmap](#roadmap)

---

## Visão Geral

O **ANK Data SaaS** é uma plataforma multi-tenant de análise de dados voltada para a rede de franquias do Grupo Boticário. A arquitetura é dividida em dois painéis principais:

| Painel | URL base | Quem acessa |
|--------|----------|-------------|
| **Admin ROOT** | `/admin-ank` | Equipe interna ANK Data |
| **Painel Franqueado** | `/franqueado` | Gerentes, vendedores e controllers de cada franquia |

### Fluxo macro

```
ANK Data (Admin ROOT)
    ├── Cadastra Franquias (tenants)
    ├── Emite Licenças contratuais
    ├── Convida Admin de Franquia
    └── Monitora conformidade de uploads

Admin Franquia (Painel Franqueado)
    ├── Cadastra Lojas (PDVs)
    ├── Convida Gerentes / Vendedores / Controllers
    ├── Define acesso de cada usuário (módulos + lojas)
    ├── Personaliza White Label (cores, logo)
    └── Faz upload de arquivos de venda → ANK gera insights via IA
```

---

## Tech Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Framework** | React + Vite | 18.3 / 5.3 |
| **Linguagem** | TypeScript | 5.4 |
| **Estilo** | Tailwind CSS (dark mode `class`) | 3.4 |
| **Roteamento** | React Router DOM | v6.23 |
| **Backend / BaaS** | Supabase (PostgreSQL + Auth + PostgREST) | 2.43 |
| **Autenticação** | Supabase Auth (email/password) | — |
| **Leitura de Excel** | SheetJS (xlsx) | 0.18 |
| **Ícones** | Heroicons | v2.1 |
| **Modais** | Headless UI | 1.7 |
| **Notificações UI** | React Hot Toast | 2.4 |
| **Datas** | date-fns (pt-BR) | 3.6 |

---

## Estrutura do Projeto

```
ank-data-saas/
│
├── public/
│
├── scripts/                          # Scripts utilitários e migrações SQL
│   ├── create-admin.mjs              # Cria Admin Master via Supabase Admin API
│   ├── fix-trigger-and-admin.sql     # Corrige trigger + cria perfil admin
│   ├── migrate-schema-v2.sql         # RBAC: modulos, permissoes_papel, config
│   └── migrate-schema-v3.sql         # Lojas: lojas, usuario_lojas, permissoes_usuario
│
└── src/
    ├── components/
    │   ├── franqueado/
    │   │   ├── FranchiseHeader.tsx       # Header com dark/light toggle + sino
    │   │   ├── FranchiseSidebar.tsx      # Sidebar reativa: tema + prefs + permissões
    │   │   ├── LicenseAlertBanner.tsx    # Spec 08: banner 8-30 dias
    │   │   ├── LicenseAlertModal.tsx     # Spec 08: modal < 7 dias (1x/sessão)
    │   │   └── NotificationPanel.tsx     # Painel deslizante de notificações
    │   ├── layout/                       # Layout Admin ROOT
    │   │   ├── AdminHeader.tsx
    │   │   ├── AdminLayout.tsx
    │   │   └── AdminSidebar.tsx
    │   ├── ui/                           # Componentes reutilizáveis
    │   │   ├── Badge.tsx                 # LicenseBadge, ComplianceBadge
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Input.tsx
    │   │   ├── Modal.tsx
    │   │   └── Spinner.tsx
    │   ├── AnkMascot.tsx                 # Mascote SVG "Ankito"
    │   └── EnvGuard.tsx                  # Tela de setup quando env vars ausentes
    │
    ├── contexts/
    │   ├── AuthContext.tsx               # Sessão, perfil, signIn/signOut/signUp
    │   ├── PermissionsContext.tsx        # Módulos autorizados por papel/usuário
    │   └── ThemeContext.tsx              # Dark/Light mode (localStorage)
    │
    ├── hooks/
    │   ├── useLicense.ts                 # Licença do tenant com dias_restantes calculado
    │   └── useTenantTheme.ts             # Spec 11: carrega e aplica cores White Label
    │
    ├── lib/
    │   ├── menuPrefs.ts                  # Preferências de menu por tenant (localStorage)
    │   └── supabaseClient.ts             # Cliente Supabase inicializado com env vars
    │
    ├── pages/
    │   ├── admin/                        # Admin ROOT (somente ank_admin)
    │   │   ├── AdminDashboardPage.tsx    # Stats + alertas + conformidade
    │   │   ├── CompliancePage.tsx        # Monitor check_tenant_compliance + logs
    │   │   ├── LicensesPage.tsx          # CRUD licenças: meses, valor mensal/total
    │   │   ├── TenantsPage.tsx           # CRUD franquias: CP, Drive, ativo/inativo
    │   │   └── UsersPage.tsx             # Convite: ank_admin ou admin_franquia
    │   ├── auth/
    │   │   ├── LoginPage.tsx             # Login com mascote + Redirect inteligente
    │   │   └── RegisterPage.tsx
    │   ├── franqueado/
    │   │   ├── FranchiseLayout.tsx       # Shell: sidebar + header + alertas
    │   │   ├── DashboardPage.tsx         # KPIs + histórico uploads + empty state CTA
    │   │   ├── UploadPage.tsx            # Drag & Drop + validação schema + progresso
    │   │   ├── VendasPage.tsx            # Análise Sell-Out (placeholder → Fase 3)
    │   │   ├── EstoquePage.tsx           # Gestão Estoque (placeholder → Fase 3)
    │   │   ├── FinanceiroPage.tsx        # Financeiro (placeholder → Fase 3)
    │   │   ├── CRMPage.tsx               # CRM Retenção (placeholder → Fase 3)
    │   │   ├── ConfiguracaoPage.tsx      # Config Global: Empresa, Marca, Notif, Op.
    │   │   ├── ConfigurarMenuPage.tsx    # Ordem e visibilidade do menu (localStorage)
    │   │   ├── LojasPage.tsx             # CRUD Lojas/PDVs: canal, CNPJ, endereço
    │   │   └── FranchiseUsersPage.tsx    # Gerencia equipe: papel + lojas + módulos
    │   ├── LockScreen.tsx                # Bloqueio total por licença expirada/suspensa
    │   └── UnauthorizedPage.tsx
    │
    ├── router/
    │   ├── AppRouter.tsx                 # Mapa completo de rotas
    │   ├── ProtectedRoute.tsx            # Guard: autenticação + profile
    │   ├── AdminRoute.tsx                # Guard: papel === 'ank_admin'
    │   ├── FranchiseRoute.tsx            # Guard: franqueado + licença válida
    │   └── ModuleRoute.tsx               # Guard: por slug de módulo
    │
    ├── services/                         # Camada de acesso ao Supabase (tipada)
    │   ├── compliance.service.ts
    │   ├── franchise-users.service.ts
    │   ├── licenses.service.ts
    │   ├── lojas.service.ts
    │   ├── permissions.service.ts
    │   ├── tenants.service.ts
    │   └── users.service.ts
    │
    └── types/
        └── index.ts                      # Todas as interfaces e tipos TypeScript
```

---

## Configuração e Setup

### 1. Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (plano Free ou Pro)
- npm 9+

### 2. Instalação

```bash
git clone https://github.com/seu-usuario/ank-data-saas.git
cd ank-data-saas
npm install
```

### 3. Variáveis de ambiente

Crie `.env.local` na raiz (nunca commite este arquivo):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...anon-key...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...service-role-key...
```

> Encontre os valores em: **Supabase Dashboard → Project Settings → API**

### 4. Migrações do banco de dados

Execute os scripts SQL no **Supabase SQL Editor** nesta ordem:

```
1. scripts/fix-trigger-and-admin.sql  → trigger handle_new_user + perfil admin
2. scripts/migrate-schema-v2.sql      → RBAC, módulos, permissões, config de tenant
3. SQL de Lojas (ver seção Banco)     → lojas, usuario_lojas, permissoes_usuario
```

### 5. Criar o Admin Master

```bash
node scripts/create-admin.mjs SUA_SERVICE_ROLE_KEY
```

Ou manualmente:
1. Supabase Dashboard → Authentication → Users → Add user
2. Email: `admin@ankdata.com.br`, marque "Auto confirm"
3. SQL Editor → `UPDATE public.profiles SET papel = 'ank_admin' WHERE ...`

### 6. Executar

```bash
npm run dev       # Desenvolvimento (http://localhost:5173)
npm run build     # Build de produção
npm run preview   # Preview do build
```

> **Nota sobre Supabase Free Tier:** O projeto pode pausar após 1 semana de inatividade. O primeiro acesso do dia pode levar 20-30s (cold start). Use o botão "Entrar" e aguarde — as chamadas seguintes são instantâneas.

---

## Banco de Dados

### Schema completo

```sql
-- ── TENANTS (Franquias) ───────────────────────────────────────────────────────
CREATE TABLE public.tenants (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_franquia           varchar NOT NULL,
  codigo_cp               varchar(50),       -- Código do PDV para cruzamento de dados
  google_drive_folder_id  varchar,           -- Pasta Drive para backup de arquivos
  logo_url                text,              -- White Label: URL do logo
  cor_primaria            varchar(7) DEFAULT '#2563eb',
  cor_secundaria          varchar(7) DEFAULT '#06b6d4',
  razao_social            text,
  cnpj                    varchar(18),
  telefone                varchar(20),
  email_contato           text,
  site                    text,
  cep                     varchar(9),
  logradouro              text,
  numero                  text,
  complemento             text,
  cidade                  text,
  estado                  varchar(2),
  ativo                   boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ── PROFILES (Perfis de usuários) ────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  tenant_id   uuid REFERENCES public.tenants(id),  -- null para ank_admin
  nome        varchar NOT NULL,
  papel       varchar NOT NULL,  -- ver tabela de papéis abaixo
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── LICENSES (Licenças contratuais) ──────────────────────────────────────────
CREATE TABLE public.licenses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id),
  status           varchar NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE|ALERT|CRITICAL|EXPIRED|SUSPENDED
  data_fim_ciclo   date NOT NULL,
  meses_contrato   smallint,
  valor_contrato   numeric(10,2),  -- Valor TOTAL do contrato
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── UPLOAD_LOGS (Histórico de uploads) ───────────────────────────────────────
CREATE TABLE public.upload_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id),
  usuario_id   uuid REFERENCES public.profiles(id),
  nome_arquivo varchar NOT NULL,
  data_upload  timestamptz NOT NULL DEFAULT now()
);

-- ── MODULOS (Catálogo de módulos) ─────────────────────────────────────────────
CREATE TABLE public.modulos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_modulo  text NOT NULL UNIQUE,  -- dashboard|upload|vendas|estoque|financeiro|crm|relatorios
  nome         text NOT NULL,
  descricao    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── PERMISSOES_PAPEL (Módulos por papel — default) ────────────────────────────
CREATE TABLE public.permissoes_papel (
  papel       text NOT NULL,
  slug_modulo text NOT NULL REFERENCES public.modulos(slug_modulo),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (papel, slug_modulo)
);

-- ── LOJAS (PDVs da franquia) ──────────────────────────────────────────────────
CREATE TABLE public.lojas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id),
  nome        text NOT NULL,
  codigo_pdv  text,
  canal       varchar(20) DEFAULT 'Varejo',  -- 'Varejo' | 'Venda Direta'
  cnpj        varchar(18),
  cep         varchar(9),
  logradouro  text,
  numero      text,
  complemento text,
  cidade      text,
  estado      varchar(2),
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── USUARIO_LOJAS (Acesso usuário ↔ loja) ─────────────────────────────────────
CREATE TABLE public.usuario_lojas (
  usuario_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  loja_id     uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, loja_id)
);

-- ── PERMISSOES_USUARIO (Override individual de módulos) ────────────────────────
CREATE TABLE public.permissoes_usuario (
  usuario_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug_modulo text NOT NULL REFERENCES public.modulos(slug_modulo) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, slug_modulo)
);
```

### Função SQL de conformidade

```sql
-- Retorna status de conformidade por franquia (usado no monitor e no admin)
CREATE OR REPLACE FUNCTION public.check_tenant_compliance()
RETURNS TABLE (
  tenant_id         uuid,
  tenant_name       text,           -- = tenants.nome_franquia
  last_upload_date  timestamptz,
  days_since_upload integer,
  compliance_status text            -- 'OK' | 'COMPROMETIDO' (> 7 dias sem upload)
) LANGUAGE sql SECURITY DEFINER ...
```

### Row Level Security

Todas as tabelas têm RLS habilitado. Estratégia:

| Tabela | Política-chave |
|--------|---------------|
| `tenants` | `is_ank_admin()` para admin; tenant próprio para franqueados |
| `profiles` | `auth.uid() = id` para próprio perfil; `is_ank_admin()` para admin |
| `licenses` | `is_ank_admin()` para admin; tenant próprio para franqueados |
| `upload_logs` | `is_ank_admin()` para admin; tenant próprio para franqueados |
| `lojas` | Admin franquia gerencia seu tenant; usuários veem lojas atribuídas |
| `usuario_lojas` | Admin franquia gerencia seu tenant |
| `permissoes_usuario` | Admin franquia gerencia seu tenant |

```sql
-- Função chave: evita circular dependency nas políticas do admin
CREATE OR REPLACE FUNCTION public.is_ank_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND papel = 'ank_admin');
$$;
```

---

## Autenticação e RBAC

### Papéis (campo `papel` na tabela `profiles`)

| Papel | Painel | Permissão |
|-------|--------|-----------|
| `ank_admin` | Admin ROOT | Total — sem restrição de módulo ou licença |
| `admin_franquia` | Franqueado | Total no seu tenant — gerencia equipe e lojas |
| `gerente` | Franqueado | Módulos de `permissoes_papel` + lojas de `usuario_lojas` |
| `vendedor` | Franqueado | Módulos de `permissoes_papel` + lojas de `usuario_lojas` |
| `controller_financeiro` | Franqueado | Módulos de `permissoes_papel` + lojas de `usuario_lojas` |

### Módulos padrão por papel (`permissoes_papel`)

| Módulo | gerente | vendedor | controller |
|--------|:-------:|:--------:|:----------:|
| dashboard | ✅ | ✅ | ✅ |
| upload | ✅ | ✅ | — |
| vendas | ✅ | ✅ | — |
| estoque | ✅ | — | — |
| financeiro | — | — | ✅ |
| crm | ✅ | — | — |
| relatorios | ✅ | — | ✅ |

> O `admin_franquia` pode criar overrides individuais via `permissoes_usuario` para cada membro da equipe.

### Fluxo de login

```
1. LoginPage.handleSubmit()
2.   AuthContext.signIn(email, password)
3.     supabase.auth.signInWithPassword()   ← valida no servidor
4.     loadProfile(user.id)                 ← busca perfil + papel do banco
5.     retorna Profile
6.   papel === 'ank_admin' → navigate('/admin-ank')
     outro papel           → navigate('/franqueado')

Guards de rota:
  ProtectedRoute  → !user → /login
  AdminRoute      → papel ≠ 'ank_admin' → /unauthorized
  FranchiseRoute  → !licença válida → /lock
  ModuleRoute     → !can(slug) → /unauthorized
```

### Guilhotina de Licença (Spec 08)

```
dias_restantes > 30         → Acesso normal
8 ≤ dias_restantes ≤ 30    → 🟡 LicenseAlertBanner (banner dismissível no topo)
0 ≤ dias_restantes < 7     → 🔴 LicenseAlertModal (modal 1x por sessão no login)
dias_restantes < 0          → 🔒 LOCK_SCREEN (bloqueio total — só botão "Sair")
status EXPIRED ou SUSPENDED → 🔒 LOCK_SCREEN (imediato)
```

---

## Painel Admin ROOT

**URL:** `/admin-ank` | **Acesso:** exclusivo `ank_admin`

### Páginas e funcionalidades

#### Dashboard (`/admin-ank`)
- Cards: Total Franquias, Licenças Ativas, Expirando em 30 dias, Franquias Comprometidas
- Tabela: Licenças expirando em breve
- Tabela: Franquias com status COMPROMETIDO

#### Franquias (`/admin-ank/tenants`)
- Listagem com: Nome, Código CP, Google Drive ID, Status (Ativa/Inativa)
- Ações: **Editar** (nome, CP, Drive ID) | **Visualizar Licença** (modal) | **Ativar/Desativar**
- Cadastro de nova franquia

#### Licenças (`/admin-ank/licenses`)
- Formulário de **Nova Licença**:
  - Dropdown: seleciona a franquia
  - Input: Meses de Contrato → calcula `data_fim_ciclo` automaticamente
  - Input: Valor Mensal (R$) → calcula valor total do contrato
  - Status inicial: `ACTIVE`
- Ações: **Suspender/Ativar** | **Editar** (status, data fim, valor total)

#### Usuários (`/admin-ank/users`)
- Convite de dois tipos:
  - **Administrador Interno ANK Data** (`ank_admin`) — sem vínculo de franquia
  - **Admin de Franquia** (`admin_franquia`) — com seleção obrigatória de franquia
- Badges coloridos por papel

#### Conformidade (`/admin-ank/compliance`)
- Tabela: todas as franquias com 🟢 CONFORME / 🔴 COMPROMETIDO
- Colunas: Franquia, Código CP, Último Upload, Dias sem Upload
- Histórico dos últimos 50 uploads

---

## Painel Franqueado

**URL:** `/franqueado` | **Acesso:** papéis de franquia com licença ativa

### Módulos de dados

| Rota | Módulo | Descrição | Status |
|------|--------|-----------|--------|
| `/franqueado` | Dashboard | KPIs + histórico de uploads + empty state CTA | ✅ Ativo |
| `/franqueado/upload` | Upload | Drag & Drop + validação de schema + progresso | ✅ Ativo |
| `/franqueado/vendas` | Vendas | Sell-Out, giro, performance por vendedor | 🔜 Fase 3 |
| `/franqueado/estoque` | Estoque | Ruptura iminente, estoque parado | 🔜 Fase 3 |
| `/franqueado/financeiro` | Financeiro | Margens, descontos, antecipação | 🔜 Fase 3 |
| `/franqueado/crm` | CRM | Segmentação, reativação, campanhas | 🔜 Fase 3 |

### Configuração (apenas `admin_franquia`)

#### Configuração Global (`/franqueado/configuracoes`)

| Aba | Conteúdo |
|-----|----------|
| Empresa | Nome, Razão Social, CNPJ, Telefone, E-mail, Site, Endereço |
| Marca | Logo URL (preview), Cor Primária, Cor Secundária (color picker em tempo real) |
| Notificações | Toggles por categoria de evento |
| Operacional | Dark/Light mode, Fuso Horário, Idioma, Moeda |

#### Configurar Menu (`/franqueado/configurar-menu`)
- Lista todos os módulos com toggles de visibilidade
- Setas para reordenar
- Salva em `localStorage` com chave `ank_menu_prefs.{tenantId}`
- Sidebar atualiza imediatamente via evento `ank:menu-prefs-updated`

#### Lojas / PDVs (`/franqueado/lojas`)
- CRUD completo com:
  - **Nome** da loja
  - **Canal**: Varejo 🏪 ou Venda Direta 🚀
  - **Código PDV** (corresponde ao campo `Cod. PDV` dos arquivos de venda)
  - **CNPJ**
  - **Endereço** completo (CEP, Logradouro, Número, Complemento, Cidade, UF)
  - **Status**: Ativa / Inativa
- Resumo no topo: Total de lojas por canal

#### Usuários da Franquia (`/franqueado/usuarios`)
- Lista: gerentes, vendedores e controllers com badges por papel
- Mostra lojas vinculadas e módulos permitidos
- Modal de **Criar Usuário**:
  - Nome, Email, Senha temporária
  - Papel (Gerente / Vendedor / Controller)
  - **Lojas com acesso** (checkboxes — se nenhuma selecionada, vê todas)
  - **Módulos permitidos** (padrão do papel OR seleção personalizada)

---

## White Label Dinâmico

*(Spec 11)*

### Como funciona

```
1. FranchiseLayout monta → useTenantTheme() executa
2. Busca cor_primaria + cor_secundaria do tenant no banco
3. applyFranchiseColors(primary, secondary) injeta:
   a. CSS variables no :root
      --fp-primary, --fp-secondary, --fp-primary-dark, --fp-primary-light
   b. <style id="ank-franchise-theme"> com classes:
      .franchise-nav-active { background-color: var(--fp-primary) }
      .franchise-btn-primary { background-color: var(--fp-primary) }
      .franchise-tab-active { border-color: var(--fp-primary) }
4. Sidebar e botões usam essas classes → cores atualizadas

Em tempo real (Configuração → Marca):
  Color picker onChange → applyFranchiseColors() → feedback imediato
  Salvar → persistido no banco → carregado novamente no próximo acesso
```

### Dark/Light Mode

```
ThemeContext (localStorage 'ank_theme')
  light → document.documentElement.classList.remove('dark')
  dark  → document.documentElement.classList.add('dark')

Tailwind: darkMode: 'class' (tailwind.config.js)
Toggle: FranchiseHeader → botão ☀️/🌙
```

---

## Upload e Validação de Arquivos

*(Spec 05 e 10)*

### Formatos suportados

| Formato | Validação de colunas | Biblioteca |
|---------|---------------------|-----------|
| `.csv` | ✅ Lê headers (primeiros 8KB) | FileReader nativo |
| `.xlsx` | ✅ Lê 1ª linha da planilha | SheetJS (xlsx) |
| `.xls` | ✅ Lê 1ª linha da planilha | SheetJS (xlsx) |
| `.parquet` | ⏭ Registra diretamente | — |

### Colunas obrigatórias (relatório Boticário)

```
Cod. Estrutura | AnoMes | Nome Vendedor | Papel | Cod. PDV
```

> Comparação normalizada: ignora espaços, pontos e case.

### Fluxo de upload

```
1. Usuário arrasta arquivo na zona de Drag & Drop
2. Sistema detecta tipo pelo .ext
3. Lê headers LOCALMENTE (sem tráfego ao servidor)
4. Valida presença das 5 colunas obrigatórias
5a. INVÁLIDO → exibe checklist com colunas ausentes, NÃO envia
5b. VÁLIDO → INSERT em upload_logs {tenant_id, usuario_id, nome_arquivo, data_upload}
6. Barra de progresso exibe feedback (validando → enviando → sucesso)
7. Dispara window.dispatchEvent('ank:upload-completed')
```

---

## Controle de Licenças

### Campos relevantes (`licenses`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `status` | varchar | ACTIVE \| ALERT \| CRITICAL \| EXPIRED \| SUSPENDED |
| `data_fim_ciclo` | date | Data de vencimento do contrato |
| `meses_contrato` | smallint | Duração em meses |
| `valor_contrato` | numeric | Valor TOTAL (= valor_mensal × meses) |

### `dias_restantes` (calculado client-side)

```typescript
// Não existe como coluna no banco — calculado em useLicense.ts
const dias = differenceInDays(parseISO(license.data_fim_ciclo), new Date())
```

### Criação de nova licença (Admin ROOT)

```
valor_mensal (input) × meses_contrato (input) = valor_contrato (calculado)
data_inicio = hoje
data_fim_ciclo = hoje + meses_contrato
status = 'ACTIVE'
```

---

## Scripts Utilitários

### `scripts/create-admin.mjs`
Cria o Admin Master via Supabase Admin API (sem precisar de confirmação de e-mail).

```bash
node scripts/create-admin.mjs eyJhbGci...service_role_key...
```

### `scripts/fix-trigger-and-admin.sql`
- Corrige `handle_new_user()` para usar `nome` e `papel` (campos reais do banco)
- Permite `tenant_id = NULL` (para ank_admin)
- Cria o perfil admin com `papel = 'ank_admin'`

### `scripts/migrate-schema-v2.sql`
- Adiciona colunas de configuração a `tenants` e `licenses`
- Cria `modulos` e `permissoes_papel` com dados seed
- Cria função `is_ank_admin()` SECURITY DEFINER
- Cria políticas RLS para o admin em todas as tabelas operacionais
- Cria função `check_tenant_compliance()`

### `scripts/migrate-schema-v3.sql` *(a criar)*
```sql
-- Adicionar ao SQL Editor:
CREATE TABLE public.lojas ( ... );
CREATE TABLE public.usuario_lojas ( ... );
CREATE TABLE public.permissoes_usuario ( ... );
-- + políticas RLS conforme documentação do banco
```

---

## Referência de Specs

| # | Spec | Papel Profissional | Status |
|---|------|--------------------|--------|
| 01 | Sell-Out e Giro de Estoque | Engenheiro de Supply Chain | 🔜 Fase 3 |
| 02 | Performance de Time | Gerente Regional Sênior | 🔜 Fase 3 |
| 03 | Gestão de Margem | Controller Financeiro | 🔜 Fase 3 |
| 04 | Inteligência de Retenção (CRM) | Especialista Growth Marketing | 🔜 Fase 3 |
| 05 | Interface de Upload e Validação | Engenheiro UI/UX Sênior | ✅ Implementado |
| 06 | Pipeline e Backup no Drive | Arquiteto de Dados | 🔜 Edge Function |
| 07 | SaaS Multi-Tenant (RLS) | DBA Enterprise | ✅ Implementado |
| 08 | Licenciamento e Alertas Comerciais | Gestor de Licenciamento | ✅ Implementado |
| 09 | Dashboards e DataViz Reativo | Designer DataViz | 🔄 Parcial |
| 10 | UX de Upload | Especialista UX | ✅ Implementado |
| 11 | UI White Label Dinâmico | Designer White Label | ✅ Implementado |
| 12 | Consultor de Campo Digital | Consultor Senior Boticário | 🔜 Fase 3 |
| 13 | Scripts e Marketing Local | Gerador de Campanhas | 🔜 Fase 3 |
| 14 | Auditoria de Processos | Auditor de Conformidade | ✅ Implementado |

---

## Roadmap

### Fase 1 ✅ — Admin ROOT e Segurança
- Admin ROOT completo (franquias, licenças, usuários, conformidade)
- Autenticação com RBAC em duas camadas
- Guilhotina de licença (Banner → Modal → LockScreen)
- Convite de usuários por papel

### Fase 2 ✅ — Painel do Franqueado
- Layout responsivo com Dark/Light mode
- Upload Drag & Drop (CSV, XLSX, XLS, Parquet) com validação de schema
- Dashboard com KPIs e histórico de uploads
- White Label dinâmico (cores + logo por franquia)
- Configuração de menu (ordem e visibilidade)
- Gestão de Lojas / PDVs com canal, CNPJ e endereço
- Gestão de usuários da franquia com controle por loja e módulo
- Sino de notificações com painel deslizante

### Fase 3 🔜 — DataViz, IA e Integrações
- [ ] Processamento de arquivos com DuckDB/Apache Arrow (backend)
- [ ] Integração com Google Drive API (Spec 06)
- [ ] Dashboard de Sell-Out reativo (Spec 01, 09)
- [ ] Análise de performance de vendedores (Spec 02)
- [ ] Módulo financeiro com alertas de margem (Spec 03)
- [ ] CRM com segmentação e reativação (Spec 04)
- [ ] Geração de scripts WhatsApp por campanha (Spec 13)
- [ ] Relatórios com exportação PDF (Spec 12)
- [ ] AI Insights via Supabase Edge Functions
- [ ] Filtros de relatório por Loja/PDV (usando `usuario_lojas`)

---

## Licença

Projeto proprietário — **ANK Data** © 2026. Todos os direitos reservados.

> Desenvolvido com Claude Code (Anthropic) · Supabase · React · TypeScript
