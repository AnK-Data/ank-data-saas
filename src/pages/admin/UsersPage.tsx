import { useEffect, useState, type FormEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PlusIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { UsersService } from '../../services/users.service'
import { TenantsService } from '../../services/tenants.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import type { Profile, UserRole, Tenant } from '../../types'

// ─── Tipagem local enriquecida com join ──────────────────────────────────────

type ProfileRow = Profile & { tenant?: { id: string; nome_franquia: string } }

// ─── Configuração visual dos papéis ──────────────────────────────────────────

interface RoleConfig {
  label: string
  badge: string  // classes Tailwind do badge
  icon?: React.ReactNode
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  ank_admin: {
    label: 'Admin ANK',
    badge: 'bg-ank-900 text-white ring-ank-700',
  },
  admin_franquia: {
    label: 'Admin Franquia',
    badge: 'bg-violet-100 text-violet-800 ring-violet-400/30',
  },
  gerente: {
    label: 'Gerente',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  },
  vendedor: {
    label: 'Vendedor',
    badge: 'bg-blue-50 text-blue-700 ring-blue-500/20',
  },
  controller_financeiro: {
    label: 'Controller',
    badge: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  },
}

function RoleBadge({ papel }: { papel: string }) {
  const cfg = ROLE_CONFIG[papel] ?? { label: papel, badge: 'bg-slate-100 text-slate-600 ring-slate-300' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]       = useState<ProfileRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing]   = useState<ProfileRow | null>(null)

  async function fetchUsers() {
    const { data, error } = await UsersService.list()
    if (!error && data) setUsers(data as ProfileRow[])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  if (loading) return <Spinner fullScreen />

  // Separação por nível de acesso
  const ankAdmins     = users.filter(u => u.papel === 'ank_admin')
  const franchiseAdmins = users.filter(u => u.papel === 'admin_franquia')
  const operational   = users.filter(u => !['ank_admin', 'admin_franquia'].includes(u.papel))

  return (
    <>
      <div className="space-y-6">

        {/* ── Header geral ──────────────────────────────────────────────── */}
        <Card padding={false}>
          <div className="px-6 py-5 border-b border-slate-100">
            <CardHeader
              title="Gerenciamento de Usuários"
              subtitle={`${ankAdmins.length} admin ANK · ${franchiseAdmins.length} admin franquia · ${operational.length} operacional`}
              action={
                <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                  + Convidar Usuário
                </Button>
              }
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Usuário</th>
                  <th className="px-6 py-3">Papel / Função</th>
                  <th className="px-6 py-3">Franquia Vinculada</th>
                  <th className="px-6 py-3">Criado em</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">Nenhum usuário encontrado.</td>
                  </tr>
                ) : users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">

                    {/* Avatar + Nome */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                          font-semibold text-sm uppercase
                          ${user.papel === 'ank_admin'
                            ? 'bg-ank-900 text-white'
                            : user.papel === 'admin_franquia'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                          {user.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.nome}</p>
                        </div>
                      </div>
                    </td>

                    {/* Papel com badge colorido */}
                    <td className="px-6 py-4">
                      <RoleBadge papel={user.papel} />
                    </td>

                    {/* Franquia vinculada */}
                    <td className="px-6 py-4">
                      {user.papel === 'ank_admin' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <ShieldCheckIcon className="h-3.5 w-3.5 text-ank-600" />
                          Interno ANK Data
                        </span>
                      ) : user.tenant?.nome_franquia ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <BuildingStorefrontIcon className="h-3.5 w-3.5 text-violet-500" />
                          {user.tenant.nome_franquia}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem vínculo</span>
                      )}
                    </td>

                    {/* Data */}
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {format(parseISO(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      {user.papel !== 'ank_admin' && (
                        <Button variant="ghost" size="sm"
                          leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                          onClick={() => setEditing(user)}>
                          Editar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Legenda de papéis ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 px-1">
          <p className="text-xs text-slate-400 self-center">Papéis:</p>
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
            <span key={key} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────── */}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSaved={async () => { setInviteOpen(false); setLoading(true); await fetchUsers() }}
      />

      <EditUserModal
        open={editing !== null}
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); setLoading(true); await fetchUsers() }}
      />
    </>
  )
}

// ─── Modal de Convite (visão Admin ROOT) ─────────────────────────────────────
/**
 * O Admin ROOT da ANK Data pode convidar apenas dois tipos de usuários:
 *  1. Administrador Interno ANK Data  → papel: 'ank_admin'  (sem franquia)
 *  2. Admin de Franquia               → papel: 'admin_franquia' (franquia obrigatória)
 *
 * Usuários operacionais (Gerente, Vendedor, Controller) são criados pelo
 * próprio Admin Franquia dentro do painel do franqueado — não por aqui.
 */

type InviteType = 'ank_admin' | 'admin_franquia'

interface InviteOption {
  value: InviteType
  label: string
  description: string
  badge: string
  requiresFranquia: boolean
}

const INVITE_OPTIONS: InviteOption[] = [
  {
    value:            'ank_admin',
    label:            'Administrador Interno ANK Data',
    description:      'Acesso completo ao painel Admin ROOT. Sem vínculo de franquia.',
    badge:            ROLE_CONFIG.ank_admin.badge,
    requiresFranquia: false,
  },
  {
    value:            'admin_franquia',
    label:            'Admin de Franquia',
    description:      'Master da franquia selecionada. Gerenciará usuários operacionais no painel franqueado.',
    badge:            ROLE_CONFIG.admin_franquia.badge,
    requiresFranquia: true,
  },
]

function InviteModal({ open, onClose, onSaved }: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [tenants, setTenants]       = useState<Pick<Tenant, 'id' | 'nome_franquia'>[]>([])
  const [tipo, setTipo]             = useState<InviteType>('admin_franquia')
  const [nome, setNome]             = useState('')
  const [email, setEmail]           = useState('')
  const [senha, setSenha]           = useState('')
  const [tenantId, setTenantId]     = useState('')
  const [saving, setSaving]         = useState(false)

  const selected = INVITE_OPTIONS.find(o => o.value === tipo)!

  useEffect(() => {
    if (open) {
      TenantsService.listActive().then(({ data }) =>
        setTenants((data ?? []) as Pick<Tenant, 'id' | 'nome_franquia'>[])
      )
      setNome(''); setEmail(''); setSenha(''); setTenantId(''); setTipo('admin_franquia')
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (selected.requiresFranquia && !tenantId) {
      toast.error('Selecione a franquia para este usuário.')
      return
    }
    if (senha.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres.'); return }

    setSaving(true)
    try {
      const { error } = await UsersService.invite({
        nome,
        email,
        senha,
        tenant_id: selected.requiresFranquia ? tenantId : '',
        papel:     tipo as UserRole,
      })
      if (error) throw error
      toast.success(`${selected.label} convidado com sucesso! Um e-mail de confirmação foi enviado.`)
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Convidar Novo Usuário" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="invite-form" type="submit" loading={saving}>Enviar Convite</Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit} className="space-y-5">

        {/* ── Seleção do tipo de usuário ─────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Tipo de Acesso *</label>
          <div className="grid grid-cols-1 gap-2">
            {INVITE_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors
                  ${tipo === opt.value
                    ? 'border-ank-500 bg-ank-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={opt.value}
                  checked={tipo === opt.value}
                  onChange={() => { setTipo(opt.value); setTenantId('') }}
                  className="mt-0.5 accent-ank-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${opt.badge}`}>
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Dados pessoais ─────────────────────────────────────────── */}
        <Input label="Nome Completo" value={nome} onChange={e => setNome(e.target.value)}
          placeholder="João da Silva" required />

        <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="joao@franquia.com.br" required autoComplete="off" />

        <Input label="Senha Temporária" type="password" value={senha}
          onChange={e => setSenha(e.target.value)}
          placeholder="Mínimo 8 caracteres" required
          hint="O usuário poderá alterar após o primeiro acesso." />

        {/* ── Seleção de franquia (apenas Admin Franquia) ─────────────── */}
        {selected.requiresFranquia && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Franquia *
              <span className="ml-1 text-xs text-violet-600 font-normal">(obrigatório para Admin Franquia)</span>
            </label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm
                focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200"
            >
              <option value="">Selecione a franquia…</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.nome_franquia}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Este usuário gerenciará os demais membros desta franquia.
            </p>
          </div>
        )}

        {/* ── Aviso informativo ───────────────────────────────────────── */}
        <div className={`rounded-xl px-4 py-3 flex gap-2.5 text-xs
          ${tipo === 'ank_admin'
            ? 'bg-ank-50 border border-ank-200 text-ank-800'
            : 'bg-violet-50 border border-violet-200 text-violet-800'
          }`}>
          {tipo === 'ank_admin'
            ? <ShieldCheckIcon className="h-4 w-4 shrink-0 mt-0.5 text-ank-600" />
            : <BuildingStorefrontIcon className="h-4 w-4 shrink-0 mt-0.5 text-violet-600" />
          }
          <span>
            {tipo === 'ank_admin'
              ? 'Este usuário terá acesso total ao painel Admin ROOT da ANK Data.'
              : 'O Admin de Franquia acessa o painel do franqueado e poderá criar Vendedores e Controllers para sua equipe.'
            }
          </span>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal de Edição ─────────────────────────────────────────────────────────

function EditUserModal({ open, user, onClose, onSaved }: {
  open: boolean
  user: ProfileRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [tenants, setTenants]   = useState<Pick<Tenant, 'id' | 'nome_franquia'>[]>([])
  const [nome, setNome]         = useState('')
  const [tenantId, setTenantId] = useState('')
  const [papel, setPapel]       = useState<UserRole>('admin_franquia')
  const [saving, setSaving]     = useState(false)

  const editableRoles: { value: UserRole; label: string }[] = [
    { value: 'admin_franquia',       label: 'Admin de Franquia' },
    { value: 'gerente',              label: 'Gerente' },
    { value: 'vendedor',             label: 'Vendedor' },
    { value: 'controller_financeiro', label: 'Controller Financeiro' },
  ]

  useEffect(() => {
    if (open && user) {
      setNome(user.nome)
      setTenantId(user.tenant_id ?? '')
      setPapel(user.papel)
      TenantsService.listActive().then(({ data }) =>
        setTenants((data ?? []) as Pick<Tenant, 'id' | 'nome_franquia'>[])
      )
    }
  }, [open, user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const { error } = await UsersService.updateProfile(user.id, {
        nome,
        papel,
        tenant_id: tenantId || null,
      })
      if (error) throw error
      toast.success('Usuário atualizado.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={`Editar — ${user?.nome ?? ''}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="edit-user-form" type="submit" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome Completo" value={nome}
          onChange={e => setNome(e.target.value)} required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Papel / Função</label>
          <select value={papel} onChange={e => setPapel(e.target.value as UserRole)}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200">
            {editableRoles.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Franquia Vinculada</label>
          <select value={tenantId} onChange={e => setTenantId(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200">
            <option value="">Sem vínculo</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.nome_franquia}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  )
}
