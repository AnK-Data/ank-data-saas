import { useEffect, useState, type FormEvent } from 'react'
import { PlusIcon, PencilSquareIcon, BuildingStorefrontIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { FranchiseUsersService, type FranchiseUser } from '../../services/franchise-users.service'
import { LojasService, type Loja } from '../../services/lojas.service'
import { PermissionsService } from '../../services/permissions.service'
import type { UserRole } from '../../types'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const PAPEL_LABELS: Record<string, string> = {
  gerente:               'Gerente',
  vendedor:              'Vendedor',
  controller_financeiro: 'Controller Financeiro',
}

const PAPEL_COLORS: Record<string, string> = {
  gerente:               'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  vendedor:              'bg-blue-50 text-blue-700 ring-blue-600/20',
  controller_financeiro: 'bg-amber-50 text-amber-700 ring-amber-600/20',
}

export default function FranchiseUsersPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? ''

  const [users, setUsers]       = useState<FranchiseUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing]   = useState<FranchiseUser | null>(null)

  async function fetchUsers() {
    if (!tenantId) return
    const { data } = await FranchiseUsersService.list(tenantId)
    setUsers((data ?? []) as FranchiseUser[])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [tenantId])

  if (loading) return <Spinner fullScreen />

  return (
    <>
      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <CardHeader
            title="Usuários da Franquia"
            subtitle={`${users.length} usuário${users.length !== 1 ? 's' : ''} cadastrado${users.length !== 1 ? 's' : ''}`}
            action={
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setInviteOpen(true)}>
                + Novo Usuário
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Função</th>
                <th className="px-6 py-3">Lojas com Acesso</th>
                <th className="px-6 py-3">Módulos</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <span>Nenhum usuário cadastrado nesta franquia.</span>
                      <p className="text-xs max-w-xs">Clique em "+ Novo Usuário" para convidar gerentes, vendedores e controllers.</p>
                    </div>
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Usuário */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center
                        text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase shrink-0">
                        {user.nome.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{user.nome}</span>
                    </div>
                  </td>

                  {/* Função */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
                      ${PAPEL_COLORS[user.papel] ?? 'bg-slate-100 text-slate-600 ring-slate-300'}`}>
                      {PAPEL_LABELS[user.papel] ?? user.papel}
                    </span>
                  </td>

                  {/* Lojas */}
                  <td className="px-6 py-4">
                    {user.usuario_lojas && user.usuario_lojas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.usuario_lojas.map((ul: { loja_id: string; loja: { id: string; nome: string } }) => (
                          <span key={ul.loja_id}
                            className="inline-flex items-center gap-1 text-xs bg-violet-50 dark:bg-violet-950/30
                              text-violet-700 dark:text-violet-400 rounded-full px-2 py-0.5">
                            <BuildingStorefrontIcon className="h-3 w-3" />
                            {ul.loja?.nome ?? '—'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">Todas as lojas</span>
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
                    <Button variant="ghost" size="sm"
                      leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                      onClick={() => setEditing(user)}>
                      Editar
                    </Button>
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
  const [nome, setNome]         = useState('')
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [papel, setPapel]       = useState<UserRole>('gerente')
  const [lojas, setLojas]       = useState<Loja[]>([])
  const [selectedLojas, setSelectedLojas] = useState<string[]>([])
  const [selectedModulos, setSelectedModulos] = useState<string[]>([])
  const [modSrc, setModSrc]     = useState<'papel' | 'custom'>('papel')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (open) {
      // Carrega lojas disponíveis
      LojasService.list(tenantId).then(({ data }) => setLojas((data ?? []) as Loja[]))

      if (initial) {
        setNome(initial.nome)
        setPapel(initial.papel)
        setSelectedLojas((initial.usuario_lojas ?? []).map((ul: { loja_id: string }) => ul.loja_id))
        const mods = (initial.modulos ?? []).map((m: { slug_modulo: string }) => m.slug_modulo)
        setSelectedModulos(mods)
        setModSrc(mods.length > 0 ? 'custom' : 'papel')
      } else {
        setNome(''); setEmail(''); setSenha(''); setPapel('gerente')
        setSelectedLojas([]); setSelectedModulos([]); setModSrc('papel')
      }

      // Carrega módulos padrão do papel selecionado
      PermissionsService.getSlugsForPapel(initial?.papel ?? 'gerente').then(({ data }) => {
        if (modSrc === 'papel' && data) {
          setSelectedModulos(data.map(r => r.slug_modulo))
        }
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
    if (!initial && senha.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres.'); return }
    setSaving(true)
    try {
      const slugModulos = modSrc === 'custom' ? selectedModulos : []

      const { error } = initial
        ? await FranchiseUsersService.update(initial.id, { nome, papel, lojaIds: selectedLojas, slugModulos })
        : await FranchiseUsersService.create({ nome, email, senha, papel, tenant_id: tenantId, lojaIds: selectedLojas, slugModulos })

      if (error) throw error
      toast.success(initial ? 'Usuário atualizado.' : 'Usuário convidado! E-mail de confirmação enviado.')
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
            <Input label="Nome Completo *" value={nome} onChange={e => setNome(e.target.value)} required />
            {!initial && (
              <>
                <Input label="E-mail *" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" />
                <Input label="Senha Temporária *" type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  hint="Mínimo 8 caracteres. O usuário poderá alterar após o primeiro acesso." required />
              </>
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
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            🏪 Lojas com acesso
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Selecione quais lojas este usuário pode visualizar. Se nenhuma for selecionada, ele verá todas.
          </p>
          {lojas.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
              Nenhuma loja cadastrada. Cadastre lojas em <strong>Configuração → Lojas</strong> primeiro.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {lojas.filter(l => l.ativo).map(loja => (
                <label key={loja.id}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors
                    ${selectedLojas.includes(loja.id)
                      ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}>
                  <input type="checkbox" checked={selectedLojas.includes(loja.id)}
                    onChange={() => toggleLoja(loja.id)} className="accent-violet-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{loja.nome}</p>
                    {loja.codigo_pdv && <p className="text-[10px] font-mono text-slate-400">{loja.codigo_pdv}</p>}
                  </div>
                </label>
              ))}
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
