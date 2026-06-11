# ANK Data — Plataforma SaaS Multi-Tenant

Plataforma de inteligência de dados para o varejo de cosméticos. Transforma arquivos de venda em insights acionáveis para franquias, com painel administrativo centralizado e módulos contratáveis por tenant.

---

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React + Vite | 18.3 / 5.3 |
| Linguagem | TypeScript | 5.4 |
| Estilo | Tailwind CSS (dark mode `class`) | 3.4 |
| Roteamento | React Router DOM | v6 |
| Backend / Auth | Supabase (PostgreSQL + Auth + PostgREST) | 2.x |
| Edge Functions | Deno (Supabase Functions) | — |
| Leitura Parquet | hyparquet | 1.4.0 |
| Fonte de dados | Google Drive API v3 (service account) | — |
| Gráficos | Recharts | 3.x |
| Ícones | Heroicons | v2.1 |
| Deploy | Vercel (frontend) + Supabase (backend) | — |

---

## Arquitetura

```
Admin ROOT (/admin-ank)          Painel Franqueado (/franqueado)
─────────────────────────        ─────────────────────────────────
Gestão de tenants e planos       Dashboard, Vendas, Estoque, CRM
Licenças e contratos             Financeiro, Venda Direta
Onboarding Kanban                Logística, Folha
Usuários ANK Data                Input Comercial (upload)
Base Mestre de Produtos          Comunicados, Notificações
Conformidade de uploads          Configuração, Lojas, Usuários
```

Ambos os painéis são separados por papel (`papel` no `profiles`). O acesso é bloqueado por licença expirada via `LicenseAlertBanner → LicenseAlertModal → LockScreen`.

---

## Módulos do Painel Franqueado

| Módulo | Slug | Descrição |
|---|---|---|
| Dashboard | `dashboard` | KPIs do ciclo atual e alertas |
| Vendas | `vendas` | Sell-out, ticket médio, ranking de PDVs |
| Estoque | `estoque` | Posição por PDV, alertas de ruptura |
| CRM | `crm` | Base de clientes e segmentação |
| Financeiro | `financeiro` | Receitas, inadimplência e projeções |
| Venda Direta | `venda-direta` | Revendedoras, supervisores, estruturas, produtos por ciclo |
| Logística | `logistica` | Volume, cobertura geográfica, mix de entrega |
| Folha | `folha` | Apuração de comissões (multi-setor) |
| Input Comercial | `upload` | Upload de arquivos parquet / Excel |
| Comunicados | — | Avisos da AnK Data |
| Notificações | — | Alertas automáticos |

---

## Edge Functions (Deno)

| Função | Descrição |
|---|---|
| `drive-parquet-query` | Baixa `.parquet` do Drive, processa com hyparquet e retorna dados agregados. Cache em `vd_query_cache` com invalidação por `modifiedTime`. |
| `drive-parquet-schema` | Retorna schema e amostra do parquet |
| `drive-parquet-data` | Exportação de dados brutos |
| `admin-update-user` | Atualiza e-mail e/ou senha via service role (somente `ank_admin`) |

### Variáveis das Edge Functions

Configure em **Supabase Dashboard → Settings → Edge Functions → Secrets**:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=<email>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<chave PEM>
```

---

## Estrutura do Projeto

```
src/
  components/       Componentes reutilizáveis (UI, layout, franqueado)
  contexts/         AuthContext, PermissionsContext, ThemeContext
  lib/              supabaseClient, menuPrefs
  pages/
    admin/          Painel Admin AnK Data
    auth/           Login, Primeiro Acesso, Redefinir Senha
    franqueado/     Todos os módulos do franqueado
  router/           AppRouter com rotas protegidas por papel
  services/         UsersService, TenantsService, etc.
  types/            Tipos globais, RBAC, labels

supabase/
  functions/        Edge Functions (Deno)
  migrations/       Migrações SQL versionadas
```

---

## Configuração Local

### Pré-requisitos

- Node.js 20+
- npm 10+
- Conta Supabase com projeto criado

### Instalação

```bash
git clone https://github.com/<org>/ank-data-saas.git
cd ank-data-saas
npm install
```

### Variáveis de ambiente

Crie `.env.local` na raiz (já ignorado pelo `.gitignore`):

```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

> Encontre em: **Supabase Dashboard → Project Settings → API**

### Banco de dados

```bash
# Aplicar migrações no projeto remoto (requer projeto linkado)
npx supabase db push --linked
```

### Rodar localmente

```bash
npm run dev       # http://localhost:5173
npm run build     # Build de produção
npm run preview   # Preview do build
```

### Deploy das Edge Functions

```bash
npx supabase functions deploy drive-parquet-query --project-ref <ref>
npx supabase functions deploy admin-update-user   --project-ref <ref>
```

---

## RBAC — Papéis

### Equipe AnK Data

| Papel | Acesso |
|---|---|
| `ank_admin` | Total — inclui gestão de usuários (editar e-mail, senha, papel) |
| `ank_suporte` | Leitura ampla para diagnóstico |
| `ank_comercial` | Gestão de tenants e contratos |
| `ank_financeiro` | Visão financeira de licenças |
| `ank_tech` | Acesso técnico e configurações |

### Painel Franqueado

| Papel | Permissões |
|---|---|
| `franqueado` / `sucessor` | Acesso completo ao painel da franquia + seção Sistema |
| `gerente_canal_loja` | Canal Varejo / Loja |
| `gerente_canal_vd` | Canal Venda Direta |
| `funcionario_administrativo_cp` | Visão administrativa ampla |
| Demais cargos | Conforme permissões do módulo |

---

## Cache de Consultas Parquet

Consultas são cacheadas na tabela `vd_query_cache`:

```
cache_key = "<query_type>:<filtros_ordenados>:<page>:<page_size>"
```

Invalidação automática: quando o `modifiedTime` do arquivo no Drive muda, a chave não bate e o sistema recomputa + atualiza o cache.

No frontend, o hook `useVDQuery` implementa **stale-while-revalidate**:
- Exibe dados do `localStorage` imediatamente (< 1ms)
- Busca dados frescos em background
- Indicador "Atualizando..." enquanto refresca

---

## Controle de Licenças

```
dias_restantes > 30         → Acesso normal
8 ≤ dias_restantes ≤ 30    → Banner amarelo (dismissível por sessão)
0 ≤ dias_restantes < 8     → Modal bloqueante (1x por sessão)
dias_restantes < 0          → LockScreen (bloqueio total)
status EXPIRED | SUSPENDED  → LockScreen imediato
```

---

## Deploy (Vercel)

O arquivo `vercel.json` redireciona todas as rotas para `index.html` (SPA):

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Configure em **Vercel → Project Settings → Environment Variables** as mesmas variáveis do `.env.local` (exceto `SERVICE_ROLE_KEY` se não necessário no build).

---

## Licença

Proprietário — ANK Data © 2026. Todos os direitos reservados.
