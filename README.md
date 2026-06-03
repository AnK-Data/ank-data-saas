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
7. [Módulo Ingresse — Gestão de Colaboradores](#módulo-ingresse--gestão-de-colaboradores)
8. [Base Mestre de Produtos](#base-mestre-de-produtos)
9. [Painel Admin ROOT](#painel-admin-root)
10. [Painel Franqueado](#painel-franqueado)
11. [White Label Dinâmico](#white-label-dinâmico)
12. [Upload e Validação de Arquivos](#upload-e-validação-de-arquivos)
13. [Controle de Licenças](#controle-de-licenças)
14. [Deploy (Vercel)](#deploy-vercel)
15. [Scripts Utilitários](#scripts-utilitários)
16. [Roadmap](#roadmap)

---

## Visão Geral

O **ANK Data SaaS** é uma plataforma multi-tenant de análise de dados voltada para a rede de franquias do Grupo Boticário. A arquitetura é dividida em dois painéis principais:

| Painel | URL base | Quem acessa |
|--------|----------|-------------|
| **Admin ROOT** | `/admin-ank` | Equipe interna ANK Data |
| **Painel Franqueado** | `/franqueado` | Colaboradores e gestores de cada franquia |

### Fluxo macro

```
ANK Data (Admin ROOT)
    ├── Cadastra Franquias (tenants) e Planos
    ├── Emite Licenças contratuais
    ├── Gerencia usuários internos
    ├── Mantém Base Mestre de Produtos (global)
    └── Monitora conformidade de uploads

Admin Franquia (Painel Franqueado)
    ├── Faz upload da Lista Ingresse → ativa plataforma
    ├── Cadastra Lojas (PDVs)
    ├── Gerencia colaboradores (status, lojas, módulos)
    ├── Define acesso por usuário (lojas + módulos)
    ├── Personaliza White Label (cores, logo)
    └── Faz upload de arquivos de venda
```

---

## Tech Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Framework** | React + Vite | 18.3 / 5.4 |
| **Linguagem** | TypeScript | 5.5 |
| **Estilo** | Tailwind CSS (dark mode `class`) | 3.4 |
| **Roteamento** | React Router DOM | v6 |
| **Backend / BaaS** | Supabase (PostgreSQL + Auth + PostgREST) | 2.x |
| **Leitura de Excel** | SheetJS (xlsx) | 0.18 |
| **Ícones** | Heroicons | v2.1 |
| **Notificações UI** | React Hot Toast | 2.4 |
| **Datas** | date-fns (pt-BR) | 3.6 |
| **Deploy** | Vercel | — |

### Scripts de dados (Python)

| Biblioteca | Uso |
|-----------|-----|
| `pandas` | Manipulação de planilhas Ingresse |
| `unicodedata` | Remoção de acentos na padronização |
| `re` | Normalização de strings |
| `openpyxl` | Leitura de arquivos `.xlsx` |

---

## Estrutura do Projeto

```
ank-data-saas/
│
├── public/
├── scripts/                              # Scripts utilitários e migrações SQL
│   ├── create-admin.mjs                  # Cria Admin Master via Supabase Admin API
│   ├── fix-trigger-and-admin.sql
│   ├── migrate-schema-v2.sql
│   └── migrate-schema-v3.sql
│
├── vercel.json                           # Config SPA routing para Vercel
│
└── src/
    ├── components/
    │   ├── franqueado/
    │   │   ├── FranchiseHeader.tsx
    │   │   ├── FranchiseSidebar.tsx
    │   │   ├── LicenseAlertBanner.tsx
    │   │   ├── LicenseAlertModal.tsx
    │   │   └── NotificationPanel.tsx
    │   ├── layout/
    │   │   ├── AdminHeader.tsx
    │   │   ├── AdminLayout.tsx
    │   │   └── AdminSidebar.tsx
    │   ├── products/
    │   │   ├── ImportHistory.tsx
    │   │   ├── ProductFilters.tsx
    │   │   ├── ProductTable.tsx
    │   │   └── ProductUpload.tsx
    │   └── ui/
    │       ├── Badge.tsx
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── Input.tsx
    │       ├── Modal.tsx
    │       └── Spinner.tsx
    │
    ├── contexts/
    │   ├── AuthContext.tsx               # signIn (email) + signInIngresse (ID Ingresse)
    │   ├── PermissionsContext.tsx
    │   └── ThemeContext.tsx
    │
    ├── hooks/
    │   ├── useLicense.ts
    │   ├── useProducts.ts
    │   └── useTenantTheme.ts
    │
    ├── lib/
    │   └── supabaseClient.ts
    │
    ├── pages/
    │   ├── admin/
    │   │   ├── AdminDashboardPage.tsx
    │   │   ├── AdminsEmpresasPage.tsx    # Usuários de todas as empresas
    │   │   ├── ClientesListPage.tsx      # Hub de clientes / franquias
    │   │   ├── CompliancePage.tsx
    │   │   ├── ContratosPage.tsx
    │   │   ├── OnboardingKanbanPage.tsx
    │   │   ├── OnboardingPage.tsx
    │   │   ├── PlanosCatalogoPage.tsx    # Catálogo de planos (Starter, Pro, etc.)
    │   │   ├── ProductsPage.tsx          # Base Mestre de Produtos
    │   │   └── UsersPage.tsx             # Usuários internos ANK Data
    │   ├── auth/
    │   │   ├── LoginPage.tsx             # Dual mode: Colaborador GB / ANK/Prestador
    │   │   ├── PrimeiroAcessoPage.tsx    # Criação de senha (1º acesso Ingresse)
    │   │   └── RedefinirSenhaPage.tsx    # Redefinição de senha (autenticado)
    │   └── franqueado/
    │       ├── FranchiseLayout.tsx
    │       ├── DashboardPage.tsx
    │       ├── FranchiseUsersPage.tsx    # Gestão de colaboradores (Ingresse)
    │       ├── LojasPage.tsx
    │       ├── UploadPage.tsx
    │       ├── ComunicadosPage.tsx
    │       ├── NotificacoesPage.tsx
    │       └── ConfiguracaoPage.tsx
    │
    ├── router/
    │   ├── AppRouter.tsx
    │   ├── AdminRoute.tsx
    │   ├── FranchiseRoute.tsx
    │   └── ProtectedRoute.tsx
    │
    ├── services/
    │   ├── compliance.service.ts
    │   ├── comunicados.service.ts
    │   ├── franchise-users.service.ts    # list() usa get_franchise_users_full RPC
    │   ├── ingresse.service.ts           # Parse XLSX + padronizarNome/NomeCurto
    │   ├── lojas.service.ts
    │   ├── notificacoes.service.ts
    │   ├── permissions.service.ts
    │   ├── productImportService.ts
    │   ├── productsService.ts
    │   ├── tenants.service.ts
    │   └── users.service.ts
    │
    └── types/
        ├── index.ts                      # Profile, Tenant, License, UserRole, etc.
        ├── ingresse.ts                   # IngresseColaborador, IngresseRawRow
        ├── product.ts
        └── productImport.ts
```

---

## Configuração e Setup

### 1. Pré-requisitos

- Node.js 18+
- npm 9+
- Conta no [Supabase](https://supabase.com)

### 2. Instalação

```bash
git clone https://github.com/AnK-Data/ank-data-saas.git
cd ank-data-saas
npm install
```

### 3. Variáveis de ambiente

Crie `.env.local` na raiz (nunca commite):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...anon-key...
```

> Encontre em: **Supabase Dashboard → Project Settings → API**

### 4. Executar

```bash
npm run dev       # http://localhost:5173
npm run build     # Build de produção
npm run preview   # Preview do build
```

> **Free Tier:** O Supabase pode pausar após 1 semana de inatividade. O primeiro acesso pode levar 20-30s (cold start).

---

## Banco de Dados

### Tabelas principais

```sql
-- Franquias
public.tenants

-- Perfis (auth.users + dados do app)
public.profiles
  -- Colunas adicionais relevantes:
  usuario_extranet  text        -- Login Ingresse (identificador único de acesso)
  status            text        -- 'Ativo' | 'Inativo'
  first_access      boolean     -- true = deve redefinir senha no próximo login
  tipo_usuario      text        -- 'ingresse' | 'manual_ingresse' | 'prestador' | 'ank'
  cargo_ingresse    text        -- Cargo original da planilha Ingresse

-- Licenças contratuais
public.licenses

-- Lojas / PDVs de cada franquia
public.lojas
  codigo_pdv  text    -- Referência cruzada com planilha Ingresse (coluna Franquia)

-- Vínculo usuário ↔ loja (multi-loja por usuário)
public.usuario_lojas

-- Permissões individuais de módulos
public.permissoes_usuario

-- Colaboradores importados da planilha Ingresse
public.ingresse_colaboradores
  ingresse_id   text    -- Login Ingresse (ex: ankdata26)
  nome          text    -- Nome padronizado (padronizarNome)
  nome_curto    text    -- Nome curto para exibição (padronizarNomeCurto)
  cpf           text
  status        text    -- 'Ativo' | 'Inativo'
  cargo         text    -- Cargo original
  franquia      text    -- Código PDV bruto (para ProcX lookup)
  tenant_id     uuid

-- Base global de produtos (sem tenant_id)
public.products
  codigo_produto    bigint
  nome_produto      text
  nome_curto_produto text
  marca             text
  linha, familia, secao, grupo, subgrupo  text
  fora_de_linha     varchar(5)    -- 'S' = fora de linha
  iaf_make, iaf_skin, iaf_cabelos text

-- Histórico de importações de produtos
public.product_imports

-- Logs de upload
public.upload_logs
```

### Funções SQL críticas (SECURITY DEFINER)

```sql
-- Retorna tenant_id do usuário autenticado (evita recursão RLS)
public.get_auth_tenant_id() → uuid

-- Retorna IDs das lojas do tenant (evita recursão RLS)
public.get_my_loja_ids() → SETOF uuid

-- Login por ID Ingresse: retorna email interno + status
public.get_auth_by_ingresse_id(p_ingresse_id text)

-- Valida colaborador para primeiro acesso
public.check_ingresse_colaborador(p_ingresse_id text)

-- Lista colaboradores (ingresse_colaboradores ∪ profiles) com ProcX de lojas
public.get_franchise_users_full(p_tenant_id uuid) → TABLE(...)

-- Conformidade de uploads por franquia
public.check_tenant_compliance() → TABLE(...)

-- Trunca tabela de produtos (importação em lote)
public.truncate_products()
```

### RLS — Estratégia anti-recursão

Tabelas com RLS usam funções SECURITY DEFINER para evitar circular dependency:

```
lojas RLS → get_auth_tenant_id() → profiles (sem RLS) ✓
usuario_lojas RLS → get_my_loja_ids() → lojas (sem RLS) ✓
profiles RLS → is_ank_admin() → profiles (sem RLS) ✓
```

---

## Autenticação e RBAC

### Modos de login

| Modo | Identificador | Quem usa |
|------|--------------|----------|
| **Colaborador GB** | Login Ingresse (ex: `ankdata26`) | Colaboradores de franquia |
| **ANK / Prestador** | E-mail | Equipe ANK Data e Prestadores PJ |

### Fluxo Colaborador GB

```
1. LoginPage (modo Ingresse) → signInIngresse(ingresseId, password)
2. AuthContext → get_auth_by_ingresse_id(id) → busca email interno
3. status === 'Inativo' → lança erro (acesso bloqueado)
4. first_access === true → redirect /primeiro-acesso
5. supabase.auth.signInWithPassword(email_interno, password)
6. navigate('/franqueado')
```

### Fluxo Primeiro Acesso

```
1. Colaborador acessa /primeiro-acesso
2. Informa ID Ingresse → check_ingresse_colaborador() valida
3. Define senha → supabase.auth.signUp(email_interno, senha)
4. Profile criado com usuario_extranet, first_access=false
5. Acesso liberado
```

### Reset de Senha (pelo Admin)

Admin clica **"Resetar senha"** no painel de usuários → `profiles.first_access = true`  
→ usuário é redirecionado para `/redefinir-senha` no próximo login.

### Papéis

| Papel | Domínio | Permissão |
|-------|---------|-----------|
| `ank_admin` | ANK | Total |
| `ank_suporte` | ANK | Leitura ampla |
| `ank_comercial` | ANK | Tenants e contratos |
| `ank_financeiro` | ANK | Visão financeira |
| `ank_tech` | ANK | Técnico / infra |
| `franqueado` | Franquia | Visão comercial geral |
| `gerente_loja` | Franquia | Sua loja + vendedores |
| `consultor_loja` | Franquia | Próprios valores |
| `gerente_canal_vd` | Franquia | Toda a VD |
| ... (20+ papéis) | Franquia | Conforme cargo Boticário |

---

## Módulo Ingresse — Gestão de Colaboradores

### Fluxo de onboarding

```
1. Admin faz Upload da Lista Ingresse (.xlsx)
2. Sistema parseia: Login, Nome, CPF, Status, Cargo, Franquia
3. Aplica padronizarNome() e padronizarNomeCurto() nos nomes
4. UPSERT em ingresse_colaboradores (por tenant_id + ingresse_id)
5. Colaboradores "Ativo" já podem fazer primeiro acesso
```

### Padronização de nomes

```typescript
padronizarNome('ADRIELLY LIMA VIANA')
// → 'Adrielly Lima Viana'

padronizarNome('ANA LIA CRISTINA DA SILVA')
// → 'Ana Lia Cristina da Silva'   (artigos em minúsculo)

padronizarNomeCurto('Ana Lia Cristina da Silva')
// → 'Ana Lia da Silva'   (2ª palavra ≤3 chars → usa 3 tokens)

padronizarNomeCurto('Fernando Canhoto Silva')
// → 'Fernando Canhoto'  (2ª palavra >3 chars → usa 2 tokens)
```

### ProcX — Resolução de lojas

A coluna `Franquia` da planilha contém o **Código PDV numérico** da loja.  
O sistema cruza com `lojas.codigo_pdv` para exibir o nome customizado da loja:

```
ingresse_colaboradores.franquia = "5985"
→ lojas WHERE codigo_pdv = "5985"
→ nome = "SHOP"   (nome cadastrado pelo admin)
```

Se não houver cadastro correspondente, exibe o código bruto como fallback.

### Gestão de colaboradores

| Ação | Disponível para |
|------|----------------|
| Upload lista Ingresse (UPSERT) | Admin franquia |
| Inativar / Reativar imediato | Admin franquia |
| Resetar acesso (force first_access) | Admin franquia |
| Editar dados (nome, cargo, lojas) | Admin franquia |
| Vincular múltiplas lojas | Admin franquia |
| Filtrar por nome / status / cargo / loja | Admin franquia |

---

## Base Mestre de Produtos

Tabela global `products` — sem `tenant_id`, gerenciada exclusivamente pela ANK Data.

### Importação

```
1. Admin ANK → Configuração → Produtos → Upload
2. Upload XLSX com 17 colunas obrigatórias
3. TRUNCATE + INSERT em lotes de 1.000 registros
4. Barra de progresso em tempo real
5. Histórico de importações registrado em product_imports
```

### Consulta

Todas as franquias consultam a mesma base global via:
```
GET /products?select=*&order=codigo_produto.asc
```

Com filtros server-side por marca, linha, família, seção, grupo, subgrupo e fora_de_linha.

---

## Painel Admin ROOT

**URL:** `/admin-ank` | **Acesso:** papéis `ank_*`

| Seção | Rota | Descrição |
|-------|------|-----------|
| Dashboard | `/admin-ank` | KPIs + alertas de licença e conformidade |
| Clientes | `/admin-ank/clientes` | Hub: lista, onboarding, kanban, contratos |
| Usuários das Empresas | `/admin-ank/clientes/admins` | Todos os colaboradores de todas as franquias |
| Planos | `/admin-ank/licenses` | Catálogo Starter / Pro / Enterprise |
| Usuários ANK | `/admin-ank/users` | Equipe interna |
| Conformidade | `/admin-ank/compliance` | Monitor de uploads por franquia |
| Produtos | `/admin-ank/produtos` | Base Mestre Global |
| Configuração | `/admin-ank/configuracao` | Cores e configurações do admin |

---

## Painel Franqueado

**URL:** `/franqueado` | **Acesso:** colaboradores com licença ativa

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/franqueado` | ✅ Ativo |
| Upload | `/franqueado/upload` | ✅ Ativo |
| Vendas | `/franqueado/vendas` | 🔜 Fase 3 |
| Estoque | `/franqueado/estoque` | 🔜 Fase 3 |
| Financeiro | `/franqueado/financeiro` | 🔜 Fase 3 |
| CRM | `/franqueado/crm` | 🔜 Fase 3 |
| Comunicados | `/franqueado/comunicados` | ✅ Ativo |
| Notificações | `/franqueado/notificacoes` | ✅ Ativo |
| Lojas/PDVs | `/franqueado/lojas` | ✅ Ativo |
| Usuários | `/franqueado/usuarios` | ✅ Ativo |

---

## White Label Dinâmico

```
useTenantTheme() → busca cor_primaria + cor_secundaria do tenant
→ applyFranchiseColors() → injeta CSS variables no :root
   --fp-primary, --fp-secondary, --fp-primary-dark, --fp-primary-light

Admin → Configuração → Marca → color picker → feedback em tempo real
Salvar → persiste no banco → carrega no próximo acesso
```

---

## Upload e Validação de Arquivos

### Colunas obrigatórias (relatório Boticário)

```
Cod. Estrutura | AnoMes | Nome Vendedor | Papel | Cod. PDV
```

### Colunas obrigatórias (lista Ingresse)

```
Login | Nome | CPF | Status | Cargo | Franquia
```

### Colunas obrigatórias (base de produtos)

```
Cod. Produto | Nome Produto | NomeCurto Produto | Unidade | Fora de Linha
Linha | Familia | Secao | Grupo | Subgrupo | Inclusao | Alteracao
Marca_Estrutura | Marca | IAF_Make | IAF_Skin | IAF_Cabelos
```

---

## Controle de Licenças

```
dias_restantes > 30         → Acesso normal
8 ≤ dias_restantes ≤ 30    → 🟡 LicenseAlertBanner (dismissível)
0 ≤ dias_restantes < 7     → 🔴 LicenseAlertModal (1x/sessão)
dias_restantes < 0          → 🔒 LOCK_SCREEN (bloqueio total)
status EXPIRED ou SUSPENDED → 🔒 LOCK_SCREEN (imediato)
```

---

## Deploy (Vercel)

### Configuração

O arquivo `vercel.json` redireciona todas as rotas para `index.html` (SPA):

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### Variáveis de ambiente na Vercel

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon pública |

### Deploy automático

Cada push na branch `main` dispara deploy automático na Vercel.

### Supabase — configurações pós-deploy

Em **Authentication → URL Configuration**:
- Site URL: `https://seu-app.vercel.app`
- Redirect URLs: `https://seu-app.vercel.app/**`, `http://localhost:5173/**`

---

## Scripts Utilitários

### `scripts/create-admin.mjs`

Cria o Admin Master via Supabase Admin API.

```bash
node scripts/create-admin.mjs SEU_SERVICE_ROLE_KEY
```

### `scripts/fix-trigger-and-admin.sql`

- Corrige trigger `handle_new_user()`
- Cria perfil admin com `papel = 'ank_admin'`

### `scripts/migrate-schema-v2.sql`

- RBAC, módulos, permissões
- Funções `is_ank_admin()`, `check_tenant_compliance()`
- Políticas RLS base

---

## Roadmap

### Fase 1 ✅ — Admin ROOT e Segurança

- Admin ROOT completo (clientes, licenças, usuários, conformidade)
- Autenticação com RBAC em duas camadas (ANK + Franquia)
- Guilhotina de licença (Banner → Modal → LockScreen)
- Base Mestre de Produtos com importação em lote

### Fase 2 ✅ — Painel do Franqueado e Colaboradores

- Layout responsivo com Dark/Light mode e White Label
- Módulo Ingresse: import de colaboradores, padronização, ProcX de lojas
- Login dual: Colaborador GB (ID Ingresse) + ANK/Prestador (email)
- Primeiro acesso: criação de senha sem senha temporária
- Gestão de usuários: multi-loja, filtros, inativar/reativar, reset de acesso
- Comunicados e Notificações
- Lojas/PDVs com canal, CNPJ, endereço
- Upload Drag & Drop com validação de schema

### Fase 3 🔜 — DataViz, IA e Integrações

- [ ] Processamento de arquivos com DuckDB/Arrow
- [ ] Integração Google Drive (backup automático)
- [ ] Dashboard Sell-Out reativo
- [ ] Análise de performance por vendedor
- [ ] Módulo financeiro com alertas de margem
- [ ] CRM com segmentação e reativação
- [ ] AI Insights via Supabase Edge Functions
- [ ] Relatórios com exportação PDF

---

## Licença

Projeto proprietário — **ANK Data** © 2026. Todos os direitos reservados.

> Desenvolvido com Claude Code (Anthropic) · Supabase · React · TypeScript · Vercel
