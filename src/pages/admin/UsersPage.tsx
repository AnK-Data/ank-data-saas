import { useEffect, useState, type FormEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PlusIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { UsersService } from '../../services/users.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import type { Profile, UserRole, AnkRole } from '../../types'
import { PAPEL_LABELS, ANK_ROLES, isAnkRole } from '../../types'

// --- Tipagem local enriquecida com join ---

type ProfileRow = Profile & { tenant?: { id: string; nome_franquia: string } }

// --- Configuração visual dos papéis ---

interface RoleConfig { label: string; badge: string }

const ROLE_CONFIG: Record<string, RoleConfig> = {
  ank_admin:      { label: PAPEL_LABELS['ank_admin'],      badge: 'bg-ank-900 text-white ring-ank-700' },
  ank_suporte:    { label: PAPEL_LABELS['ank_suporte'],    badge: 'bg-ank-700 text-white ring-ank-500' },
  ank_comercial:  { label: PAPEL_LABELS['ank_comercial'],  badge: 'bg-ank-600 text-white ring-ank-400' },
  ank_financeiro: { label: PAPEL_LABELS['ank_financeiro'], badge: 'bg-ank-500 text-white ring-ank-300' },
  ank_tech:       { label: PAPEL_LABELS['ank_tech'],       badge: 'bg-slate-700 text-white ring-slate-500' },
}

function RoleBadge({ papel }: { papel: string }) {
  const cfg = ROLE_CONFIG[papel] ?? { label: papel, badge: 'bg-slate-100 text-slate-600 ring-slate-300' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

// --- Página principal ---

export default function UsersPage() {
  const { profile: me } = useAuth()
  const isAdmin = me?.papel === 'ank_admin'

  const [users, setUsers]           = useState<ProfileRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing]       = useState<ProfileRow | null>(null)

  async function fetchUsers() {
    const { data, error } = await UsersService.list()
    if (!error && data) {
      setUsers((data as ProfileRow[]).filter(u => isAnkRole(u.papel)))
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  if (loading) return <Spinner fullScreen />

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <Card padding={false}>
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60">
            <CardHeader
              title="Usuários AnK Data"
              subtitle={`${users.length} membro${users.length !== 1 ? 's' : ''} da equipe interna AnK Data`}
              action={
                isAdmin ? (
                  <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                    + Convidar Usuário
                  </Button>
                ) : undefined
              }
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60">
                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-6 py-3">Usuário</th>
                  <th className="px-6 py-3">Papel / Função</th>
                  <th className="px-6 py-3">Franquia Vinculada</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Criado em</th>
                  {isAdmin && <th className="px-6 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">Nenhum usuário encontrado.</td>
                  </tr>
                ) : users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">

                    {/* Avatar + Nome */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm uppercase
                          ${isAnkRole(user.papel) ? 'bg-ank-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {user.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{user.nome}</p>
                          {user.usuario_extranet && (
                            <p className="text-[10px] text-slate-400">{user.usuario_extranet}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Papel */}
                    <td className="px-6 py-4"><RoleBadge papel={user.papel} /></td>

                    {/* Franquia */}
                    <td className="px-6 py-4">
                      {user.papel === 'ank_admin' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <ShieldCheckIcon className="h-3.5 w-3.5 text-ank-600" />
                          Interno AnK Data
                        </span>
                      ) : user.tenant?.nome_franquia ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <BuildingStorefrontIcon className="h-3.5 w-3.5 text-violet-500" />
                          {user.tenant.nome_franquia}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem vínculo</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset
                        ${user.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800'
                          : 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800'
                        }`}>
                        {user.status ?? 'Ativo'}
                      </span>
                    </td>

                    {/* Data */}
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {format(parseISO(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>

                    {/* Ações — apenas ank_admin logado */}
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm"
                          leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                          onClick={() => setEditing(user)}>
                          Editar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Legenda de papéis */}
        <div className="flex flex-wrap gap-3 px-1">
          <p className="text-xs text-slate-400 self-center">Papéis:</p>
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
            <span key={key} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Modais */}
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

// --- Modal de Convite ---

type InviteType = AnkRole

interface InviteOption {
  value: InviteType
  label: string
  description: string
  badge: string
}

const INVITE_OPTIONS: InviteOption[] = [
  { value: 'ank_admin',      label: PAPEL_LABELS['ank_admin'],      description: 'Acesso completo ao painel Admin ROOT. Sem vínculo de franquia.',         badge: ROLE_CONFIG.ank_admin.badge },
  { value: 'ank_suporte',    label: PAPEL_LABELS['ank_suporte'],    description: 'Leitura ampla para diagnóstico de franquias.',                           badge: ROLE_CONFIG.ank_suporte.badge },
  { value: 'ank_comercial',  label: PAPEL_LABELS['ank_comercial'],  description: 'Gestão de tenants, contratos e renovações.',                             badge: ROLE_CONFIG.ank_comercial.badge },
  { value: 'ank_financeiro', label: PAPEL_LABELS['ank_financeiro'], description: 'Visão de contratos, valores e status de licenças.',                      badge: ROLE_CONFIG.ank_financeiro.badge },
  { value: 'ank_tech',       label: PAPEL_LABELS['ank_tech'],       description: 'Acesso técnico — logs, infra e feature flags.',                          badge: ROLE_CONFIG.ank_tech.badge },
]

function InviteModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo]   = useState<InviteType>('ank_admin')
  const [nome, setNome]   = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setNome(''); setEmail(''); setSenha(''); setTipo('ank_admin') }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres.'); return }
    setSaving(true)
    try {
      const { error } = await UsersService.invite({ nome, email, senha, tenant_id: '', papel: tipo as UserRole })
      if (error) throw error
      toast.success('Usuário convidado com sucesso!')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar usuário.')
    } finally { setSaving(false) }
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
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Tipo de Acesso *</label>
          <div className="grid grid-cols-1 gap-2">
            {INVITE_OPTIONS.map(opt => (
              <label key={opt.value}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors
                  ${tipo === opt.value ? 'border-ank-500 bg-ank-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <input type="radio" name="tipo" value={opt.value} checked={tipo === opt.value}
                  onChange={() => setTipo(opt.value)} className="mt-0.5 accent-ank-600" />
                <div className="flex-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset mb-1 ${opt.badge}`}>
                    {opt.label}
                  </span>
                  <p className="text-xs text-slate-500 leading-snug">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <Input label="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} placeholder="João da Silva" required />
        <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@ankdata.com.br" required autoComplete="off" />
        <Input label="Senha Temporária" type="password" value={senha} onChange={e => setSenha(e.target.value)}
          placeholder="Mínimo 8 caracteres" required hint="O usuário poderá alterar após o primeiro acesso." />
        <div className={`rounded-xl px-4 py-3 flex gap-2.5 text-xs
          ${tipo === 'ank_admin' ? 'bg-ank-50 border border-ank-200 text-ank-800' : 'bg-violet-50 border border-violet-200 text-violet-800'}`}>
          {tipo === 'ank_admin'
            ? <ShieldCheckIcon className="h-4 w-4 shrink-0 mt-0.5 text-ank-600" />
            : <BuildingStorefrontIcon className="h-4 w-4 shrink-0 mt-0.5 text-violet-600" />
          }
          <span>{tipo === 'ank_admin'
            ? 'Este usuário terá acesso total ao painel Admin ROOT da AnK Data.'
            : 'Acesso ao painel conforme papel selecionado.'
          }</span>
        </div>
      </form>
    </Modal>
  )
}

// --- Modal de Edição (usuários internos AnK) ---

const ANK_ROLE_OPTIONS = ANK_ROLES.map(r => ({ value: r as UserRole, label: PAPEL_LABELS[r] }))

const inputCls = `block w-full rounded-lg border border-slate-200 dark:border-slate-600
  bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100
  placeholder:text-slate-400 shadow-sm
  focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200 dark:focus:ring-ank-900 transition-colors`

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  )
}

function EditUserModal({ open, user, onClose, onSaved }: {
  open: boolean
  user: ProfileRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nome,            setNome]            = useState('')
  const [papel,           setPapel]           = useState<AnkRole>('ank_suporte')
  const [currentEmail,    setCurrentEmail]    = useState('')
  const [loadingEmail,    setLoadingEmail]    = useState(false)
  const [newEmail,        setNewEmail]        = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass,        setShowPass]        = useState(false)
  const [saving,          setSaving]          = useState(false)

  useEffect(() => {
    if (open && user) {
      setNome(user.nome)
      setPapel((isAnkRole(user.papel) ? user.papel : 'ank_suporte') as AnkRole)
      setCurrentEmail('')
      setNewEmail('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPass(false)

      // Busca o email cadastrado via edge function (service role)
      setLoadingEmail(true)
      supabase.functions.invoke('admin-update-user', {
        body: { action: 'get', target_user_id: user.id },
      }).then(({ data }) => {
        setCurrentEmail((data as { email?: string })?.email ?? '')
      }).finally(() => setLoadingEmail(false))
    }
  }, [open, user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (newPassword && newPassword.length < 8) {
      toast.error('Senha deve ter ao menos 8 caracteres.')
      return
    }

    setSaving(true)
    try {
      // 1. Atualiza nome e papel na tabela profiles
      const { error: profileErr } = await UsersService.updateProfile(user.id, {
        nome: nome.trim(),
        papel,
      })
      if (profileErr) throw profileErr

      // 2. Atualiza email e/ou senha via edge function (requer service role)
      if (newEmail.trim() || newPassword) {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke('admin-update-user', {
          body: {
            target_user_id: user.id,
            ...(newEmail.trim()  && { email:    newEmail.trim() }),
            ...(newPassword      && { password: newPassword }),
          },
        })
        if (fnErr) throw fnErr
        if ((fnData as { error?: string })?.error) throw new Error((fnData as { error?: string }).error)
      }

      toast.success('Usuário atualizado com sucesso.')
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
          <Button form="edit-user-form" type="submit" loading={saving}>Salvar Alterações</Button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-5">

        {/* Dados do perfil */}
        <div className="space-y-4">
          <SectionLabel>Dados do Perfil</SectionLabel>

          <FieldWrap label="Nome Completo *">
            <input value={nome} onChange={e => setNome(e.target.value)} required className={inputCls} />
          </FieldWrap>

          <FieldWrap label="Papel / Função *">
            <select value={papel} onChange={e => setPapel(e.target.value as AnkRole)}
              className={inputCls}>
              {ANK_ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </FieldWrap>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700" />

        {/* Credenciais de acesso */}
        <div className="space-y-4">
          <SectionLabel>Credenciais de Acesso</SectionLabel>

          {/* E-mail atual — somente leitura */}
          <FieldWrap label="E-mail atual">
            <div className={`${inputCls} flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 cursor-default`}>
              {loadingEmail
                ? <span className="text-slate-400 text-xs">Carregando...</span>
                : <span className="text-slate-600 dark:text-slate-300 truncate">{currentEmail || '—'}</span>
              }
            </div>
          </FieldWrap>

          <p className="text-xs text-slate-400 -mt-1">
            Para alterar, preencha os campos abaixo. Deixe em branco para manter.
          </p>

          <FieldWrap label="Novo E-mail">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder={currentEmail || 'novo@ankdata.com.br'}
              autoComplete="off"
              className={inputCls}
            />
          </FieldWrap>

          <FieldWrap label="Nova Senha">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className={`${inputCls} pr-10`}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPass
                  ? <EyeSlashIcon className="h-4 w-4" />
                  : <EyeIcon      className="h-4 w-4" />
                }
              </button>
            </div>
          </FieldWrap>

          {newPassword && (
            <FieldWrap label="Confirmar Nova Senha">
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className={`${inputCls} ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : ''
                }`}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500">As senhas não coincidem.</p>
              )}
            </FieldWrap>
          )}
        </div>

      </form>
    </Modal>
  )
}
