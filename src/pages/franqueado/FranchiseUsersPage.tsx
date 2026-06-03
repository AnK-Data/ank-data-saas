import { useEffect, useState, useCallback, useRef, useMemo, type FormEvent } from 'react'
import {
  PlusIcon, PencilSquareIcon, BuildingStorefrontIcon,
  ShieldCheckIcon, CloudArrowUpIcon, ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { FranchiseUsersService, type FranchiseUser } from '../../services/franchise-users.service'
import { LojasService, type Loja } from '../../services/lojas.service'
import { PermissionsService } from '../../services/permissions.service'
import type { UserRole } from '../../types'
import { PAPEL_LABELS } from '../../types'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

// Cores por grupo de cargo
const PAPEL_COLORS: Record<string, string> = {
  // Loja
  consultor_loja:                  'bg-blue-50 text-blue-700 ring-blue-600/20',
  gerente_loja:                    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  supervisor_loja:                 'bg-teal-50 text-teal-700 ring-teal-600/20',
  multiplicador_treinamento_loja:  'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  gerente_canal_loja:              'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  // Venda Direta
  atendente_vd:                    'bg-pink-50 text-pink-700 ring-pink-600/20',
  supervisor_campo:                'bg-rose-50 text-rose-700 ring-rose-600/20',
  gerente_er:                      'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20',
  gerente_operacoes_vd:            'bg-purple-50 text-purple-700 ring-purple-600/20',
  gerente_canal_vd:                'bg-violet-50 text-violet-700 ring-violet-600/20',
  multiplicador_treinamento_vd:    'bg-pink-50 text-pink-700 ring-pink-600/20',
  // Admin CP
  franqueado:                      'bg-amber-50 text-amber-700 ring-amber-600/20',
  sucessor:                        'bg-orange-50 text-orange-700 ring-orange-600/20',
  funcionario_administrativo_cp:   'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  funcionario_financeiro_cp:       'bg-lime-50 text-lime-700 ring-lime-600/20',
}


export default function FranchiseUsersPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? ''

  const [users, setUsers]           = useState<FranchiseUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing]       = useState<FranchiseUser | null>(null)
  const [ingresseOpen, setIngresseOpen] = useState(false)

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [search, setSearch]         = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'Ativo' | 'Inativo'>('todos')
  const [filtroCargo, setFiltroCargo]   = useState('')
  const [filtroLoja, setFiltroLoja]     = useState('')

  const cargosDisponiveis = useMemo(() =>
    [...new Set(users.map(u => u.cargo).filter(Boolean) as string[])].sort()
  , [users])

  const lojasDisponiveis = useMemo(() => {
    const names = users.flatMap(u => u.lojas_json ?? [])
      .map(l => l.nome ?? l.codigo_pdv ?? '')
      .filter(Boolean)
    return [...new Set(names)].sort()
  }, [users])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter(u => {
      if (filtroStatus !== 'todos' && u.status !== filtroStatus) return false
      if (filtroCargo && u.cargo !== filtroCargo) return false
      if (filtroLoja) {
        const hasLoja = (u.lojas_json ?? []).some(
          l => (l.nome ?? l.codigo_pdv ?? '') === filtroLoja
        )
        if (!hasLoja) return false
      }
      if (q) {
        const nome = (u.nome ?? '').toLowerCase()
        const curto = (u.nome_curto ?? '').toLowerCase()
        const id = (u.ingresse_id ?? '').toLowerCase()
        if (!nome.includes(q) && !curto.includes(q) && !id.includes(q)) return false
      }
      return true
    })
  }, [users, search, filtroStatus, filtroCargo, filtroLoja])

  async function fetchUsers() {
    if (!tenantId) return
    const { data } = await FranchiseUsersService.list(tenantId)
    setUsers(data ?? [])
    setLoading(false)
  }

  async function handleToggleStatus(user: FranchiseUser, newStatus: 'Ativo' | 'Inativo') {
    // Atualiza status na tabela ingresse_colaboradores
    const { error } = await supabase
      .from('ingresse_colaboradores')
      .update({ status: newStatus })
      .eq('ingresse_id', user.ingresse_id)
      .eq('tenant_id', tenantId)
    if (error) { toast.error('Erro ao alterar status.'); return }

    // Se tem profile, atualiza também
    if (user.profile_id) {
      const action = newStatus === 'Inativo' ? FranchiseUsersService.inactivate : FranchiseUsersService.reactivate
      await action(user.profile_id)
    }

    toast.success(newStatus === 'Inativo'
      ? `${user.nome} inativado. Acesso bloqueado imediatamente.`
      : `${user.nome} reativado.`)
    setUsers(prev => prev.map(u => u.ingresse_id === user.ingresse_id ? { ...u, status: newStatus } : u))
  }

  async function handleResetAccess(user: FranchiseUser) {
    if (!user.profile_id) return
    if (!confirm(`Resetar acesso de "${user.nome}"? Ele precisará redefinir a senha no próximo login.`)) return
    const { error } = await FranchiseUsersService.resetAccess(user.profile_id)
    if (error) { toast.error('Erro ao resetar acesso.'); return }
    toast.success('Acesso resetado. Usuário deverá redefinir a senha.')
    setUsers(prev => prev.map(u => u.ingresse_id === user.ingresse_id ? { ...u, first_access: true } : u))
  }

  useEffect(() => { fetchUsers() }, [tenantId])

  if (loading) return <Spinner fullScreen />

  return (
    <>
      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <CardHeader
            title="Usuários da Franquia"
            subtitle={`${users.length} colaborador${users.length !== 1 ? 'es' : ''} · ${users.filter(u => u.profile_id).length} com conta criada${filtered.length !== users.length ? ` · ${filtered.length} exibidos` : ''}`}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm"
                  leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
                  onClick={() => setIngresseOpen(true)}>
                  Upload Lista Ingresse
                </Button>
                <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
                  onClick={() => setInviteOpen(true)}>
                  + Novo Usuário
                </Button>
              </div>
            }
          />
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou ID Ingresse…"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2 text-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200"
            />
          </div>

          {/* Status */}
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
              text-slate-700 dark:text-slate-300 px-3 py-2 text-sm">
            <option value="todos">Status: todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>

          {/* Cargo */}
          {cargosDisponiveis.length > 0 && (
            <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                text-slate-700 dark:text-slate-300 px-3 py-2 text-sm max-w-[200px]">
              <option value="">Cargo: todos</option>
              {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Loja */}
          {lojasDisponiveis.length > 0 && (
            <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                text-slate-700 dark:text-slate-300 px-3 py-2 text-sm max-w-[200px]">
              <option value="">Loja: todas</option>
              {lojasDisponiveis.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          {/* Limpar filtros */}
          {(search || filtroStatus !== 'todos' || filtroCargo || filtroLoja) && (
            <button onClick={() => { setSearch(''); setFiltroStatus('todos'); setFiltroCargo(''); setFiltroLoja('') }}
              className="text-xs text-slate-500 hover:text-red-500 transition-colors px-2">
              ✕ Limpar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Função</th>
                <th className="px-6 py-3">Lojas com Acesso</th>
                <th className="px-6 py-3">Módulos</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <span>{users.length === 0 ? 'Nenhum colaborador importado.' : 'Nenhum resultado para os filtros aplicados.'}</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Usuário */}
                  <td className="px-6 py-4 min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center
                        text-sm font-bold uppercase shrink-0
                        ${user.status === 'Inativo'
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                          : 'bg-ank-100 dark:bg-ank-900/40 text-ank-600 dark:text-ank-400'}`}>
                        {user.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        {/* Nome padronizado completo — destaque */}
                        <p className={`text-sm font-semibold leading-tight truncate
                          ${user.status === 'Inativo' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                          {user.nome}
                        </p>
                        {/* Nome curto — subtexto */}
                        {user.nome_curto && user.nome_curto !== user.nome && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate font-medium">
                            {user.nome_curto}
                          </p>
                        )}
                        {/* ID Ingresse */}
                        <span className="inline-flex items-center gap-0.5 mt-0.5 rounded px-1.5 py-0.5
                          bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          🎫 {user.ingresse_id}
                        </span>
                        {user.first_access && user.status === 'Ativo' && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                            ⏳ Aguardando 1º acesso
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset
                      ${user.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400'}`}>
                      {user.status ?? 'Ativo'}
                    </span>
                  </td>

                  {/* Função */}
                  <td className="px-6 py-4">
                    {user.papel ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
                        ${PAPEL_COLORS[user.papel] ?? 'bg-slate-100 text-slate-600 ring-slate-300'}`}>
                        {PAPEL_LABELS[user.papel] ?? user.papel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">{user.cargo ?? 'Sem conta'}</span>
                    )}
                  </td>

                  {/* Lojas — ProcX: código PDV → nome customizado */}
                  <td className="px-6 py-4 min-w-[160px]">
                    {user.lojas_json && user.lojas_json.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.lojas_json.map((l, idx) => (
                          <span key={l.id ?? idx}
                            className="inline-flex items-center gap-1 text-xs bg-violet-50 dark:bg-violet-950/30
                              text-violet-700 dark:text-violet-400 rounded-full px-2 py-0.5 whitespace-nowrap">
                            <BuildingStorefrontIcon className="h-3 w-3 shrink-0" />
                            {/* Mostra nome customizado; fallback para código PDV */}
                            {l.nome ?? l.codigo_pdv ?? '?'}
                          </span>
                        ))}
                      </div>
                    ) : user.franquia_code ? (
                      /* Código PDV sem loja cadastrada correspondente */
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800
                        text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5 font-mono">
                        <BuildingStorefrontIcon className="h-3 w-3 shrink-0" />
                        {user.franquia_code}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">—</span>
                    )}
                  </td>

                  {/* Módulos */}
                  <td className="px-6 py-4">
                    {user.modulos && user.modulos.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.modulos.map((m: { slug_modulo: string }) => (
                          <span key={m.slug_modulo}
                            className="text-[10px] bg-ank-50 dark:bg-ank-950/30 text-ank-600 dark:text-ank-400
                              rounded px-1.5 py-0.5 font-medium capitalize">
                            {m.slug_modulo}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                        <ShieldCheckIcon className="h-3 w-3" />Padrão do papel
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm"
                        leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                        onClick={() => setEditing(user)}>
                        Editar
                      </Button>
                      {user.status === 'Ativo' ? (
                        <button
                          onClick={() => handleToggleStatus(user, 'Inativo')}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Inativar colaborador">
                          Inativar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(user, 'Ativo')}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          title="Reativar colaborador">
                          Reativar
                        </button>
                      )}
                      {user.profile_id && (
                        <button
                          onClick={() => handleResetAccess(user)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          title="Forçar redefinição de senha no próximo acesso">
                          Resetar senha
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <UserModal
        open={inviteOpen || editing !== null}
        initial={editing}
        tenantId={tenantId}
        onClose={() => { setInviteOpen(false); setEditing(null) }}
        onSaved={async () => {
          setInviteOpen(false); setEditing(null)
          setLoading(true); await fetchUsers()
        }}
      />

      <IngresseUploadModal
        open={ingresseOpen}
        tenantId={tenantId}
        onClose={() => setIngresseOpen(false)}
        onSaved={async () => { setIngresseOpen(false); setLoading(true); await fetchUsers() }}
      />
    </>
  )
}

// ─── Modal: Criar/Editar usuário da franquia ──────────────────────────────────

const MODULOS_DISPONIVEIS = [
  { slug: 'dashboard',  label: 'Dashboard'          },
  { slug: 'vendas',     label: 'Vendas'              },
  { slug: 'estoque',    label: 'Estoque'             },
  { slug: 'financeiro', label: 'Financeiro'          },
  { slug: 'crm',        label: 'CRM'                 },
  { slug: 'upload',     label: 'Upload de Arquivos'  },
]

const PAPEIS = FranchiseUsersService.FRANCHISE_ROLES.map(p => ({
  value: p, label: PAPEL_LABELS[p] ?? p,
}))

function UserModal({ open, initial, tenantId, onClose, onSaved }: {
  open: boolean; initial: FranchiseUser | null; tenantId: string
  onClose: () => void; onSaved: () => void
}) {
  const [nome, setNome]             = useState('')
  const [email, setEmail]           = useState('')
  const [ingresseId, setIngresseId] = useState('')
  const [cpf, setCpf]               = useState('')
  const [cargo, setCargo]           = useState('')
  const [tipoUsuario, setTipoUsuario] = useState<'ingresse' | 'manual_ingresse' | 'prestador'>('manual_ingresse')
  const [papel, setPapel]           = useState<UserRole>('consultor_loja')
  const [lojas, setLojas]           = useState<Loja[]>([])
  const [selectedLojas, setSelectedLojas]     = useState<string[]>([])
  const [selectedModulos, setSelectedModulos] = useState<string[]>([])
  const [modSrc, setModSrc]         = useState<'papel' | 'custom'>('papel')
  const [saving, setSaving]         = useState(false)

  const isPrestador = tipoUsuario === 'prestador'

  useEffect(() => {
    if (open) {
      LojasService.list(tenantId).then(({ data }) => setLojas((data ?? []) as Loja[]))

      if (initial) {
        setNome(initial.nome)
        setPapel(initial.papel ?? 'consultor_loja')
        setIngresseId(initial.usuario_extranet ?? '')
        setCpf(initial.cpf ?? '')
        setCargo(initial.cargo_ingresse ?? '')
        setTipoUsuario((initial.tipo_usuario as 'ingresse' | 'manual_ingresse' | 'prestador') ?? 'manual_ingresse')
        setSelectedLojas((initial.lojas_json ?? []).map((l) => l.id ?? '').filter(Boolean))
        const mods = (initial.modulos ?? []).map((m: { slug_modulo: string }) => m.slug_modulo)
        setSelectedModulos(mods)
        setModSrc(mods.length > 0 ? 'custom' : 'papel')
      } else {
        setNome(''); setEmail(''); setIngresseId(''); setCpf(''); setCargo('')
        setTipoUsuario('manual_ingresse'); setPapel('consultor_loja')
        setSelectedLojas([]); setSelectedModulos([]); setModSrc('papel')
      }

      PermissionsService.getSlugsForPapel(initial?.papel ?? 'consultor_loja').then(({ data }) => {
        if (modSrc === 'papel' && data) setSelectedModulos(data.map(r => r.slug_modulo))
      })
    }
  }, [open, initial, tenantId])

  // Atualiza módulos ao trocar papel (quando no modo padrão)
  useEffect(() => {
    if (modSrc === 'papel') {
      PermissionsService.getSlugsForPapel(papel).then(({ data }) => {
        setSelectedModulos(data?.map(r => r.slug_modulo) ?? [])
      })
    }
  }, [papel, modSrc])

  function toggleLoja(id: string) {
    setSelectedLojas(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }
  function toggleModulo(slug: string) {
    setSelectedModulos(prev => prev.includes(slug) ? prev.filter(m => m !== slug) : [...prev, slug])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!initial && !isPrestador && !ingresseId.trim()) {
      toast.error('ID Ingresse obrigatório para usuários vinculados à Ingresse.'); return
    }
    setSaving(true)
    try {
      const slugModulos = modSrc === 'custom' ? selectedModulos : []

      if (initial) {
        if (!initial.profile_id) {
          // Usuário sem conta: atualiza só os dados da ingresse_colaboradores
          const { error } = await supabase
            .from('ingresse_colaboradores')
            .update({ cargo: cargo.trim() || null })
            .eq('ingresse_id', initial.ingresse_id)
            .eq('tenant_id', tenantId)
          if (error) throw error
          toast.success('Dados atualizados. As lojas só podem ser vinculadas após o primeiro acesso.')
          onSaved(); return
        }
        // Usuário com conta — usa profile_id corretamente
        const { error } = await FranchiseUsersService.update(initial.profile_id, {
          nome, papel, lojaIds: selectedLojas, slugModulos,
          usuario_extranet: ingresseId.trim() || undefined,
          cpf: cpf.trim() || undefined,
          cargo_ingresse: cargo.trim() || undefined,
        })
        if (error) throw error
      } else {
        // Prestadores: criados com email+senha (acesso imediato)
        // Ingresse: criados sem senha → primeiro acesso via /primeiro-acesso
        const senhaAleatoria = `Ank@${Math.random().toString(36).slice(2, 12)}`
        const emailInterno = isPrestador
          ? email
          : `${ingresseId.trim().toLowerCase()}@colaborador.ankdata.internal`

        const { error } = await FranchiseUsersService.create({
          nome,
          email:        emailInterno,
          senha:        senhaAleatoria,
          papel,
          tenant_id:    tenantId,
          lojaIds:      selectedLojas,
          slugModulos,
          ingresse_id:  ingresseId.trim() || undefined,
        })
        if (error) throw error

        // Se não for prestador, marcar first_access = true
        if (!isPrestador) {
          // O profile será atualizado pelo trigger do Supabase; apenas garantimos first_access
          // (será feito pelo service após create quando implementarmos a atualização)
        }
      }

      toast.success(initial
        ? 'Usuário atualizado.'
        : isPrestador
          ? 'Prestador criado. Um e-mail de confirmação foi enviado.'
          : 'Usuário Ingresse cadastrado. Ele deve acessar /primeiro-acesso para criar a senha.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={initial ? `Editar — ${initial.nome}` : 'Novo Usuário'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="fu-form" type="submit" loading={saving}>
            {initial ? 'Salvar alterações' : 'Convidar Usuário'}
          </Button>
        </>
      }
    >
      <form id="fu-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Dados pessoais */}
        <section>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Dados do usuário</p>
          <div className="space-y-3">

            {/* Tipo de usuário (apenas novo) */}
            {!initial && (
              <div className="flex gap-2 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {([
                  { value: 'manual_ingresse', label: '🎫 Ingresse' },
                  { value: 'prestador',       label: '🏢 Prestador PJ' },
                ] as const).map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setTipoUsuario(opt.value)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors
                      ${tipoUsuario === opt.value
                        ? 'bg-slate-900 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            <Input label="Nome Completo *" value={nome} onChange={e => setNome(e.target.value)} required />

            {/* ID Ingresse — obrigatório para não-prestadores */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Usuário Ingresse {!isPrestador && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={ingresseId}
                onChange={e => setIngresseId(e.target.value)}
                required={!isPrestador}
                placeholder="ex: yara32, kawany.moraes"
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                  px-3 py-2 text-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200"
              />
              {!isPrestador && (
                <p className="text-xs text-slate-400">
                  Login Extranet Boticário. Usado para autenticação e cruzamento com a planilha Ingresse.
                </p>
              )}
            </div>

            {/* CPF */}
            <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />

            {/* Cargo Ingresse */}
            <Input label="Cargo (Ingresse)" value={cargo} onChange={e => setCargo(e.target.value)} placeholder="ex: Consultor de Vendas" />

            {/* E-mail (prestadores e edição) */}
            {(!initial && isPrestador) && (
              <Input label="E-mail *" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off"
                hint="Prestadores usam e-mail para login. Um convite será enviado." />
            )}

            {/* Aviso primeiro acesso para Ingresse */}
            {!initial && !isPrestador && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                ℹ️ O colaborador deverá acessar <strong>/primeiro-acesso</strong> para criar sua senha antes do primeiro login.
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Função *</label>
              <select value={papel} onChange={e => setPapel(e.target.value as UserRole)}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                  text-slate-900 dark:text-slate-100 px-3 py-2 text-sm">
                {PAPEIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Lojas com acesso */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              🏪 Lojas com acesso
              {selectedLojas.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40
                  px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
                  {selectedLojas.length} selecionada{selectedLojas.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
            {lojas.filter(l => l.ativo).length > 0 && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedLojas(lojas.filter(l => l.ativo).map(l => l.id))}
                  className="text-[11px] text-violet-600 hover:underline">Todas</button>
                <span className="text-slate-300">·</span>
                <button type="button" onClick={() => setSelectedLojas([])}
                  className="text-[11px] text-slate-400 hover:underline">Nenhuma</button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Selecione uma ou mais lojas. Um gerente pode ter múltiplas lojas sob seu controle.
            Se nenhuma for selecionada, o usuário acessa todas.
          </p>

          {/* Aviso para usuários sem conta */}
          {initial && !initial.profile_id && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 mb-3">
              ⚠️ As lojas só podem ser vinculadas após o colaborador fazer o <strong>primeiro acesso</strong> e criar sua conta.
            </div>
          )}

          {lojas.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
              Nenhuma loja cadastrada. Vá em <strong>Configuração → Lojas/PDVs</strong> para cadastrar.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {lojas.filter(l => l.ativo).map(loja => {
                const selected = selectedLojas.includes(loja.id)
                const disabled = !!(initial && !initial.profile_id)
                return (
                  <label key={loja.id}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-colors
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${selected
                        ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}>
                    <input type="checkbox" checked={selected} disabled={disabled}
                      onChange={() => !disabled && toggleLoja(loja.id)}
                      className="accent-violet-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{loja.nome}</p>
                      {loja.codigo_pdv && <p className="text-[10px] font-mono text-slate-400">PDV {loja.codigo_pdv}</p>}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </section>

        {/* Controle de módulos */}
        <section>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            🔐 Módulos permitidos
          </p>
          <div className="flex gap-3 mb-3">
            {[
              { value: 'papel',  label: 'Padrão do papel' },
              { value: 'custom', label: 'Personalizado'    },
            ].map(opt => (
              <label key={opt.value}
                className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer text-sm transition-colors
                  ${modSrc === opt.value
                    ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30 text-ank-700 dark:text-ank-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                <input type="radio" name="mod-src" value={opt.value}
                  checked={modSrc === opt.value}
                  onChange={() => setModSrc(opt.value as 'papel' | 'custom')}
                  className="accent-ank-600" />
                {opt.label}
              </label>
            ))}
          </div>

          {modSrc === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              {MODULOS_DISPONIVEIS.map(mod => (
                <label key={mod.slug}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors
                    ${selectedModulos.includes(mod.slug)
                      ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}>
                  <input type="checkbox" checked={selectedModulos.includes(mod.slug)}
                    onChange={() => toggleModulo(mod.slug)} className="accent-ank-600" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{mod.label}</span>
                </label>
              ))}
            </div>
          )}

          {modSrc === 'papel' && selectedModulos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedModulos.map(s => (
                <span key={s} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300
                  rounded px-2 py-0.5 font-mono capitalize">{s}</span>
              ))}
            </div>
          )}
        </section>
      </form>
    </Modal>
  )
}

// ─── Modal: Upload Lista Ingresse ─────────────────────────────────────────────

import { parseIngresseXlsx, importIngresseColaboradores, type IngresseParseResult } from '../../services/ingresse.service'

function IngresseUploadModal({ open, tenantId, onClose, onSaved }: {
  open: boolean; tenantId: string; onClose: () => void; onSaved: () => void
}) {
  const [parsed, setParsed]         = useState<IngresseParseResult | null>(null)
  const [fileName, setFileName]     = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting]   = useState(false)
  const [progress, setProgress]     = useState(0)
  const [done, setDone]             = useState(false)
  const [results, setResults]       = useState<{ upserted: number; errors: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setParsed(null); setFileName(''); setDone(false); setResults(null); setProgress(0) }
  }, [open])

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await parseIngresseXlsx(file)
      if (!result.valid) {
        toast.error(`Colunas ausentes: ${result.missingColumns.join(', ')}`)
        return
      }
      setParsed(result)
      setFileName(file.name)
    } catch {
      toast.error('Erro ao ler o arquivo. Verifique o formato.')
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  async function handleImport() {
    if (!parsed?.rows.length) return
    setImporting(true); setProgress(0)
    try {
      const res = await importIngresseColaboradores(parsed.rows, tenantId, (done, total) => {
        setProgress(Math.round((done / total) * 100))
      })
      setResults(res)
      setDone(true)
      toast.success(`${res.upserted} colaboradores sincronizados com sucesso!`)
      if (res.upserted > 0) onSaved()
    } catch {
      toast.error('Erro durante a importação.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Sincronizar Lista Ingresse"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={importing}>Fechar</Button>
          {parsed && !done && (
            <Button loading={importing} onClick={handleImport}
              leftIcon={<CloudArrowUpIcon className="h-4 w-4" />}>
              Sincronizar {parsed.rows.length} colaboradores
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Zona de upload */}
        {!parsed && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                py-12 cursor-pointer transition-all text-center
                ${isDragging ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/30' : 'border-slate-300 dark:border-slate-700 hover:border-ank-400'}`}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
              <CloudArrowUpIcon className="h-10 w-10 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Arraste a lista exportada do Ingresse aqui
              </p>
              <p className="text-xs text-slate-400 mt-1">.XLSX · .XLS</p>
            </div>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <p className="font-semibold mb-1">📋 Colunas obrigatórias:</p>
              <p className="font-mono">Login · Nome · CPF · Status · Cargo · Franquia</p>
              <p className="mt-1.5">
                A sincronização usa <strong>UPSERT</strong> — atualiza existentes e insere novos. Status "Inativo" na planilha bloqueia o acesso.
              </p>
            </div>
          </>
        )}

        {/* Preview */}
        {parsed && !done && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total',   value: parsed.rows.length, color: 'text-slate-900 dark:text-slate-100' },
                { label: 'Ativos',  value: parsed.ativos,      color: 'text-emerald-600' },
                { label: 'Inativos',value: parsed.inativos,    color: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">{fileName}</p>
              <button onClick={() => setParsed(null)} className="text-xs text-red-500 hover:underline">Trocar arquivo</button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2">Login</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Cargo</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsed.rows.slice(0, 30).map((r, i) => (
                    <tr key={i} className={r.Status?.toLowerCase() === 'inativo' ? 'opacity-50' : ''}>
                      <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-400">{String(r.Login ?? '')}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{String(r.Nome ?? '')}</td>
                      <td className="px-3 py-1.5 text-slate-500">{String(r.Cargo ?? '—')}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                          ${r.Status?.toLowerCase() === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {r.Status ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {parsed.rows.length > 30 && (
                    <tr><td colSpan={4} className="px-3 py-2 text-center text-slate-400">
                      +{parsed.rows.length - 30} registros não exibidos
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {importing && (
              <div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-ank-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-slate-500 text-center mt-1">{progress}% sincronizado</p>
              </div>
            )}
          </>
        )}

        {/* Resultado */}
        {done && results && (
          <div className="text-center py-6">
            <p className="text-4xl mb-3">{results.errors === 0 ? '✅' : '⚠️'}</p>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {results.upserted} colaborador{results.upserted !== 1 ? 'es' : ''} sincronizado{results.upserted !== 1 ? 's' : ''}
              {results.errors > 0 ? ` · ${results.errors} com erro` : ''}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Colaboradores com status "Ativo" já podem fazer o primeiro acesso em <strong>/primeiro-acesso</strong>.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
