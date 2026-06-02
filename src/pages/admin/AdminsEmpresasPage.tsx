import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { format, parseISO, subDays, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MagnifyingGlassIcon, ArrowPathIcon,
  KeyIcon, ArrowTopRightOnSquareIcon,
  PlusIcon, XMarkIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { SITUACAO_CONFIG } from './ClientesListPage'
import type { Situacao } from './ClientesListPage'
import {
  PAPEL_LABELS,
  FRANQUEADO_ROLES_LOJA,
  FRANQUEADO_ROLES_VD,
  FRANQUEADO_ROLES_ADMIN,
  FRANQUEADO_ROLES_LOGISTICA,
} from '../../types'

// ─── Todos os cargos de franquia agrupados ────────────────────────────────────

const GRUPOS_ROLES = [
  {
    grupo: '🏪 Administrativo CP',
    roles: FRANQUEADO_ROLES_ADMIN.map(r => ({ value: r, label: PAPEL_LABELS[r] ?? r })),
  },
  {
    grupo: '🏬 Canal Loja (Varejo)',
    roles: FRANQUEADO_ROLES_LOJA.map(r => ({ value: r, label: PAPEL_LABELS[r] ?? r })),
  },
  {
    grupo: '🚀 Canal Venda Direta',
    roles: FRANQUEADO_ROLES_VD.map(r => ({ value: r, label: PAPEL_LABELS[r] ?? r })),
  },
  {
    grupo: '📦 Logística',
    roles: FRANQUEADO_ROLES_LOGISTICA.map(r => ({ value: r, label: PAPEL_LABELS[r] ?? r })),
  },
]


// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UsuarioRow {
  id: string
  nome: string
  papel: string
  // Colunas opcionais — presentes após rodar migrate SQL
  email_admin?: string | null
  cpf_admin?: string | null
  cargo_admin?: string | null
  ingresse_id: string | null
  ultimo_acesso: string | null
  created_at: string
  tenant_id: string | null
  tenant?: {
    id: string
    nome_franquia: string
    codigo_cp: string | null
    plano: string | null
    situacao: string
  } | null
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminsEmpresasPage() {
  const [usuarios, setUsuarios]     = useState<UsuarioRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Filtros
  const [search,         setSearch]         = useState('')
  const [filtroEmpresa,  setFiltroEmpresa]  = useState('')
  const [filtroCargo,    setFiltroCargo]    = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroIngresse, setFiltroIngresse] = useState('')

  async function fetchUsuarios() {
    // Usa RPC com SECURITY DEFINER para bypassar RLS
    const { data, error } = await supabase.rpc('get_franchise_users')

    if (error) {
      console.warn('[AdminsEmpresas] RPC error:', error.message)
      setLoading(false)
      return
    }

    // Mapeia o resultado flat da função para o formato com tenant aninhado
    const mapped: UsuarioRow[] = (data ?? []).map((r: {
      id: string; nome: string; papel: string; ingresse_id: string | null
      ultimo_acesso: string | null; created_at: string; tenant_id: string | null
      tenant_nome: string | null; tenant_cp: string | null
      tenant_plano: string | null; tenant_situacao: string | null
    }) => ({
      id:            r.id,
      nome:          r.nome,
      papel:         r.papel,
      ingresse_id:   r.ingresse_id,
      ultimo_acesso: r.ultimo_acesso,
      created_at:    r.created_at,
      tenant_id:     r.tenant_id,
      tenant: r.tenant_id ? {
        id:           r.tenant_id,
        nome_franquia: r.tenant_nome ?? '',
        codigo_cp:    r.tenant_cp,
        plano:        r.tenant_plano,
        situacao:     r.tenant_situacao ?? 'trial',
      } : null,
    }))

    setUsuarios(mapped)
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

  // Opções únicas para selects
  const empresasOpts = useMemo(() => {
    const map = new Map<string, string>()
    usuarios.forEach(u => { if (u.tenant?.id) map.set(u.tenant.id, u.tenant.nome_franquia) })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [usuarios])

  const cargosOpts = useMemo(() => {
    const set = new Set(usuarios.map(u => u.papel))
    return [...set].sort()
  }, [usuarios])


  const hasFilters = search || filtroEmpresa || filtroCargo || filtroSituacao || filtroIngresse

  // Aplicar todos os filtros
  const filtered = useMemo(() => usuarios.filter(u => {
    if (filtroEmpresa  && u.tenant_id !== filtroEmpresa) return false
    if (filtroCargo    && u.papel !== filtroCargo) return false
    if (filtroSituacao && u.tenant?.situacao !== filtroSituacao) return false
    if (filtroIngresse === 'com'    && !u.ingresse_id) return false
    if (filtroIngresse === 'sem'    &&  u.ingresse_id) return false
    if (search) {
      const s = search.toLowerCase()
      if (
        !u.nome.toLowerCase().includes(s) &&
        !(u.email_admin ?? '').toLowerCase().includes(s) &&
        !(u.cpf_admin ?? '').replace(/\D/g, '').includes(s.replace(/\D/g, '')) &&
        !(u.ingresse_id ?? '').toLowerCase().includes(s) &&
        !(u.tenant?.nome_franquia ?? '').toLowerCase().includes(s) &&
        !(u.tenant?.codigo_cp ?? '').includes(s)
      ) return false
    }
    return true
  }), [usuarios, search, filtroEmpresa, filtroCargo, filtroSituacao, filtroIngresse])

  // Stats
  const total          = usuarios.length
  const comIngresse    = usuarios.filter(u => u.ingresse_id).length
  const seteAnosAtras  = subDays(new Date(), 7)
  const loginsRecentes = usuarios.filter(u =>
    u.ultimo_acesso && isAfter(parseISO(u.ultimo_acesso), seteAnosAtras)
  ).length

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Usuários das Empresas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Todos os usuários vinculados a franquias — {total} cadastrado{total !== 1 ? 's' : ''}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm"
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            onClick={() => { setLoading(true); fetchUsuarios() }}>
            Atualizar
          </Button>
          <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setInviteOpen(true)}>
            + Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { emoji: '👥', label: 'Total de usuários', value: total },
          { emoji: '🎫', label: 'Com ID Ingresse',   value: comIngresse },
          { emoji: '📈', label: 'Logins na semana',  value: loginsRecentes },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-900 px-5 py-4 flex items-center gap-4">
            <span className="text-2xl">{s.emoji}</span>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
        {/* Busca full-text */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, CPF, empresa, código CP ou Ingresse…"
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-700
              bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm
              text-slate-900 dark:text-slate-100 placeholder:text-slate-400
              focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
        </div>

        {/* Filtros em linha */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <FunnelIcon className="h-3.5 w-3.5" /> Filtrar:
          </div>

          {/* Empresa */}
          <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:border-ank-400 focus:outline-none">
            <option value="">Todas as empresas</option>
            {empresasOpts.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>

          {/* Cargo */}
          <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:border-ank-400 focus:outline-none">
            <option value="">Todos os cargos</option>
            {GRUPOS_ROLES.map(g => (
              <optgroup key={g.grupo} label={g.grupo}>
                {g.roles
                  .filter(r => cargosOpts.includes(r.value))
                  .map(r => <option key={r.value} value={r.value}>{r.label}</option>)
                }
              </optgroup>
            ))}
          </select>

          {/* Situação da empresa */}
          <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:border-ank-400 focus:outline-none">
            <option value="">Todas as situações</option>
            {Object.entries(SITUACAO_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Ingresse */}
          <select value={filtroIngresse} onChange={e => setFiltroIngresse(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:border-ank-400 focus:outline-none">
            <option value="">Ingresse: todos</option>
            <option value="com">Com ID Ingresse</option>
            <option value="sem">Sem ID Ingresse</option>
          </select>

          {/* Limpar filtros */}
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFiltroEmpresa(''); setFiltroCargo(''); setFiltroSituacao(''); setFiltroIngresse('') }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors
                px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
              <XMarkIcon className="h-3.5 w-3.5" /> Limpar
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            {filtered.length} de {total} usuário{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800"
                style={{ backgroundColor: 'rgba(254,243,199,0.3)' }}>
                {['Empresa', 'Usuário', 'CPF', 'Cargo · Role', 'Situação', 'Ingresse', 'Último login', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">👥</span>
                      <p className="font-medium text-slate-600 dark:text-slate-400">
                        {hasFilters ? 'Nenhum usuário com esses filtros' : 'Nenhum usuário cadastrado ainda'}
                      </p>
                      {!hasFilters && (
                        <p className="text-sm text-slate-400 max-w-xs text-center">
                          Clique em "+ Novo Usuário" para cadastrar o primeiro usuário de uma franquia.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(u => {
                const sit    = (u.tenant?.situacao ?? 'trial') as Situacao
                const sitCfg = SITUACAO_CONFIG[sit] ?? SITUACAO_CONFIG.trial
                const cargo  = PAPEL_LABELS[u.papel as keyof typeof PAPEL_LABELS] ?? u.papel

                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">

                    {/* Empresa */}
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {u.tenant?.nome_franquia ?? <span className="text-slate-400">—</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {u.tenant?.codigo_cp && (
                            <span className="text-[10px] font-mono text-slate-400">CP: {u.tenant.codigo_cp}</span>
                          )}
                          {u.tenant?.plano && (
                            <span className="text-[10px] text-slate-400 lowercase">· {u.tenant.plano}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Usuário */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700
                          flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                          {u.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{u.nome}</p>
                          {u.email_admin && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{u.email_admin}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CPF */}
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {u.cpf_admin
                        ? u.cpf_admin.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Cargo · Role */}
                    <td className="px-5 py-3.5">
                      {u.cargo_admin && (
                        <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 uppercase mb-0.5">
                          {u.cargo_admin}
                        </p>
                      )}
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold
                        bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400
                        ring-1 ring-inset ring-amber-200 dark:ring-amber-800">
                        {cargo}
                      </span>
                    </td>

                    {/* Situação */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${sitCfg.badge}`}>
                        {sitCfg.label}
                      </span>
                    </td>

                    {/* Ingresse */}
                    <td className="px-5 py-3.5">
                      {u.ingresse_id
                        ? <span className="text-xs font-mono text-violet-600 dark:text-violet-400
                            bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">
                            🎫 {u.ingresse_id}
                          </span>
                        : <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                      }
                    </td>

                    {/* Último login */}
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {u.ultimo_acesso
                        ? format(parseISO(u.ultimo_acesso), 'dd/MM/yyyy', { locale: ptBR })
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {u.ingresse_id && (
                          <button title="Copiar ID Ingresse"
                            onClick={() => { navigator.clipboard.writeText(u.ingresse_id!); toast.success('ID Ingresse copiado!') }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-ank-600 hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
                            <KeyIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button title="Acessar painel"
                          onClick={() => window.open('/franqueado', '_blank')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 text-center">
            {filtered.length} usuário{filtered.length !== 1 ? 's' : ''} · ANK Data
          </div>
        )}
      </div>

      {/* Modal de convite */}
      {inviteOpen && (
        <InviteUsuarioModal
          onClose={() => setInviteOpen(false)}
          onSaved={async () => { setInviteOpen(false); setLoading(true); await fetchUsuarios() }}
        />
      )}
    </div>
  )
}

// ─── Modal: Novo Usuário de Franquia ──────────────────────────────────────────

function InviteUsuarioModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nome,       setNome]       = useState('')
  const [email,      setEmail]      = useState('')
  const [senha,      setSenha]      = useState('')
  const [papel,      setPapel]      = useState<string>(FRANQUEADO_ROLES_ADMIN[0] ?? 'franqueado')
  const [tenantId,   setTenantId]   = useState('')
  const [ingresseId, setIngresseId] = useState('')
  const [cpf,        setCpf]        = useState('')
  const [cargo,      setCargo]      = useState('')
  const [tenants,    setTenants]    = useState<{ id: string; nome_franquia: string; codigo_cp: string | null }[]>([])
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    supabase.from('tenants').select('id, nome_franquia, codigo_cp')
      .eq('ativo', true).order('nome_franquia')
      .then(({ data }) => setTenants((data ?? []) as { id: string; nome_franquia: string; codigo_cp: string | null }[]))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tenantId) { toast.error('Selecione a franquia.'); return }
    if (senha.length < 8) { toast.error('Senha: mínimo 8 caracteres.'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { data: { full_name: nome.trim() } },
      })
      if (error || !data.user) throw error ?? new Error('Falha ao criar usuário')

      await new Promise(r => setTimeout(r, 800))

      const { error: pErr } = await supabase.from('profiles').update({
        nome:         nome.trim(),
        papel,
        tenant_id:    tenantId,
        ingresse_id:  ingresseId.trim() || null,
        email_admin:  email.trim(),
        cpf_admin:    cpf.trim() || null,
        cargo_admin:  cargo.trim() || null,
      }).eq('id', data.user.id)
      if (pErr) throw pErr

      toast.success('Usuário convidado! E-mail de confirmação enviado.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-8">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl
          ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Novo Usuário de Franquia</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form id="invite-empresa-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Franquia */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Franquia (CP) *</label>
              <select value={tenantId} onChange={e => setTenantId(e.target.value)} required
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                  text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                <option value="">Selecione a franquia…</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome_franquia}{t.codigo_cp ? ` — CP ${t.codigo_cp}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cargo / Papel */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cargo / Papel *</label>
              <select value={papel} onChange={e => setPapel(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                  text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                {GRUPOS_ROLES.map(g => (
                  <optgroup key={g.grupo} label={g.grupo}>
                    {g.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Nome completo *" value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
              <Input label="E-mail *" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" />
              <Input label="Senha temporária *" type="password" value={senha} onChange={e => setSenha(e.target.value)} required hint="Mín. 8 chars." />
              <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
              <Input label="Cargo descritivo" value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Gerente de Loja" hint="Descrição livre do cargo." />
            </div>

            {/* Ingresse */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Usuário do Ingresse
                <span className="ml-1.5 text-xs text-slate-400 font-normal">(login no sistema)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🎫</span>
                <input type="text" value={ingresseId} onChange={e => setIngresseId(e.target.value)}
                  placeholder="ING-12345 ou username"
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm
                    focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
              </div>
            </div>
          </form>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancelar</Button>
            <Button form="invite-empresa-form" type="submit" loading={saving} className="flex-1">
              Cadastrar Usuário
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
