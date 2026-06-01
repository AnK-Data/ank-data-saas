import { useEffect, useState, useMemo } from 'react'
import { format, parseISO, subDays, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MagnifyingGlassIcon, ArrowPathIcon,
  KeyIcon, ArrowTopRightOnSquareIcon,
  CrownIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import { PAPEL_LABELS, SITUACAO_CONFIG } from './ClientesListPage'
import type { Situacao } from './ClientesListPage'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AdminRow {
  id: string
  nome: string
  papel: string
  email_admin: string | null
  cpf_admin: string | null
  cargo_admin: string | null
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

const ADMIN_PAPEIS = ['franqueado', 'sucessor', 'admin_franquia']

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminsEmpresasPage() {
  const [admins, setAdmins]     = useState<AdminRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')

  async function fetchAdmins() {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, nome, papel, email_admin, cpf_admin, cargo_admin,
        ingresse_id, ultimo_acesso, created_at, tenant_id,
        tenant:tenants(id, nome_franquia, codigo_cp, plano, situacao)
      `)
      .in('papel', ADMIN_PAPEIS)
      .order('nome')
    setAdmins((data ?? []) as AdminRow[])
    setLoading(false)
  }

  useEffect(() => { fetchAdmins() }, [])

  // Empresas únicas para o filtro
  const empresas = useMemo(() => {
    const map = new Map<string, string>()
    admins.forEach(a => {
      if (a.tenant?.id) map.set(a.tenant.id, a.tenant.nome_franquia)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [admins])

  // Stats
  const totalAtivos    = admins.length
  const semAdmin       = 0 // seria calculado cruzando tenants sem admin
  const seteAnosAtras  = subDays(new Date(), 7)
  const loginsRecentes = admins.filter(a =>
    a.ultimo_acesso && isAfter(parseISO(a.ultimo_acesso), seteAnosAtras)
  ).length

  // Filtro combinado
  const filtered = admins.filter(a => {
    if (filtroEmpresa && a.tenant_id !== filtroEmpresa) return false
    if (search) {
      const s = search.toLowerCase()
      if (
        !a.nome.toLowerCase().includes(s) &&
        !(a.email_admin ?? '').toLowerCase().includes(s) &&
        !(a.cpf_admin ?? '').toLowerCase().includes(s) &&
        !(a.tenant?.nome_franquia ?? '').toLowerCase().includes(s) &&
        !(a.ingresse_id ?? '').toLowerCase().includes(s)
      ) return false
    }
    return true
  })

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-xl mt-0.5">
            🛡️
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Admins das Empresas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Espelho de quem tem acesso administrativo em cada franquia.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm"
          leftIcon={<ArrowPathIcon className="h-4 w-4" />}
          onClick={() => { setLoading(true); fetchAdmins() }}>
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">👑</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total de admins ativos</span>
          </div>
          <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{totalAtivos}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚠️</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Empresas sem admin</span>
          </div>
          <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{semAdmin}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📈</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Logins na última semana</span>
          </div>
          <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{loginsRecentes}</p>
          <p className="text-xs text-slate-400 mt-0.5">admins ativos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Busca */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              Buscar
            </p>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Nome, e-mail, empresa, CPF ou usuário Ingresse…"
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700
                  bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm
                  text-slate-900 dark:text-slate-100 placeholder:text-slate-400
                  focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
            </div>
          </div>

          {/* Empresa */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              Empresa
            </p>
            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm
                focus:border-ank-400 focus:outline-none">
              <option value="">Todas as empresas</option>
              {empresas.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contagem */}
        {(search || filtroEmpresa) && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {admins.length} admins
          </p>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800"
                style={{ backgroundColor: 'rgba(254,243,199,0.4)' }}>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Empresa</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Usuário</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">CPF</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Cargo · Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Situação</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Ingresse</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Último login</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhum admin encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : filtered.map(admin => {
                const sit = (admin.tenant?.situacao ?? 'trial') as Situacao
                const sitCfg = SITUACAO_CONFIG[sit] ?? SITUACAO_CONFIG.trial

                return (
                  <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">

                    {/* Empresa */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 mt-0.5 shrink-0">🏢</span>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {admin.tenant?.nome_franquia ?? '—'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {admin.tenant?.codigo_cp && (
                              <span className="text-[10px] font-mono text-slate-400">CP: {admin.tenant.codigo_cp}</span>
                            )}
                            {admin.tenant?.plano && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                <span className="text-[10px] text-slate-400 lowercase">{admin.tenant.plano}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Usuário */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{admin.nome}</p>
                      {admin.email_admin && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{admin.email_admin}</p>
                      )}
                    </td>

                    {/* CPF */}
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {admin.cpf_admin ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Cargo · Role */}
                    <td className="px-5 py-3.5">
                      {admin.cargo_admin && (
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase leading-tight">
                          {admin.cargo_admin}
                        </p>
                      )}
                      <span className="inline-flex mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold
                        bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400
                        ring-1 ring-inset ring-amber-200 dark:ring-amber-800">
                        admin
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
                      {admin.ingresse_id
                        ? <span className="text-xs font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">
                            🎫 {admin.ingresse_id}
                          </span>
                        : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      }
                    </td>

                    {/* Último login */}
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {admin.ultimo_acesso
                        ? format(parseISO(admin.ultimo_acesso), 'dd/MM/yyyy', { locale: ptBR })
                        : <span className="text-slate-300 dark:text-slate-600">—</span>
                      }
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Copiar Ingresse ID"
                          onClick={() => {
                            if (admin.ingresse_id) {
                              navigator.clipboard.writeText(admin.ingresse_id)
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-ank-600 hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors disabled:opacity-30"
                          disabled={!admin.ingresse_id}
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                        <button
                          title="Acessar painel da franquia"
                          onClick={() => window.open(`/franqueado`, '_blank')}
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
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800
            text-xs text-slate-400 dark:text-slate-500 text-center">
            {filtered.length} admin{filtered.length !== 1 ? 's' : ''} · ANK Data Admin ROOT
          </div>
        )}
      </div>
    </div>
  )
}
