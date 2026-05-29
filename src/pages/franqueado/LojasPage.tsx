import { useEffect, useState, type FormEvent } from 'react'
import {
  PlusIcon, PencilSquareIcon,
  CheckCircleIcon, NoSymbolIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { LojasService, type Loja, type LojaFormData, type CanalLoja } from '../../services/lojas.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

// ─── Badges ──────────────────────────────────────────────────────────────────

function CanalBadge({ canal }: { canal: CanalLoja }) {
  return canal === 'Varejo'
    ? <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">🏪 Varejo</span>
    : <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20">🚀 Venda Direta</span>
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LojasPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? ''

  const [lojas, setLojas]       = useState<Loja[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<Loja | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  async function fetchLojas() {
    if (!tenantId) return
    const { data } = await LojasService.list(tenantId)
    setLojas((data ?? []) as Loja[])
    setLoading(false)
  }

  useEffect(() => { fetchLojas() }, [tenantId])

  async function handleToggle(loja: Loja) {
    setToggling(loja.id)
    await LojasService.toggle(loja.id, !loja.ativo)
    toast.success(loja.ativo ? 'Loja desativada.' : 'Loja ativada.')
    await fetchLojas()
    setToggling(null)
  }

  if (loading) return <Spinner fullScreen />

  const ativas   = lojas.filter(l => l.ativo).length
  const varejo   = lojas.filter(l => l.canal === 'Varejo').length
  const vd       = lojas.filter(l => l.canal === 'Venda Direta').length

  return (
    <>
      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Lojas ativas',     value: ativas, color: 'text-emerald-600' },
          { label: 'Varejo',           value: varejo, color: 'text-blue-600'    },
          { label: 'Venda Direta',     value: vd,     color: 'text-violet-600'  },
        ].map(card => (
          <div key={card.label}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <CardHeader
            title="Lojas / PDVs"
            subtitle={`${lojas.length} loja${lojas.length !== 1 ? 's' : ''} cadastrada${lojas.length !== 1 ? 's' : ''}`}
            action={
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => { setEditing(null); setModalOpen(true) }}>
                Nova Loja
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-6 py-3">Nome da Loja</th>
                <th className="px-6 py-3">Canal</th>
                <th className="px-6 py-3">Código PDV</th>
                <th className="px-6 py-3">CNPJ</th>
                <th className="px-6 py-3">Cidade / UF</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lojas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <BuildingStorefrontIcon className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-600 dark:text-slate-400">Nenhuma loja cadastrada</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Cadastre as lojas da sua franquia para vincular a gerentes e filtrar relatórios por PDV.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : lojas.map(loja => (
                <tr key={loja.id}
                  className={`transition-colors ${!loja.ativo ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>

                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{loja.nome}</td>

                  <td className="px-6 py-4"><CanalBadge canal={loja.canal} /></td>

                  <td className="px-6 py-4">
                    {loja.codigo_pdv
                      ? <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                          {loja.codigo_pdv}
                        </span>
                      : <span className="text-slate-400 text-xs">—</span>}
                  </td>

                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-mono">
                    {loja.cnpj ?? <span className="text-slate-400">—</span>}
                  </td>

                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                    {loja.cidade && loja.estado
                      ? `${loja.cidade} / ${loja.estado}`
                      : loja.cidade || <span className="text-slate-400">—</span>}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset
                      ${loja.ativo
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 ring-slate-300 dark:bg-slate-800 dark:text-slate-500'}`}>
                      {loja.ativo ? '● Ativa' : '○ Inativa'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm"
                        leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                        onClick={() => { setEditing(loja); setModalOpen(true) }}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" loading={toggling === loja.id}
                        leftIcon={loja.ativo
                          ? <NoSymbolIcon className="h-4 w-4 text-red-500" />
                          : <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
                        onClick={() => handleToggle(loja)}>
                        {loja.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <LojaModal
        open={modalOpen}
        initial={editing}
        tenantId={tenantId}
        onClose={() => setModalOpen(false)}
        onSaved={async () => { setModalOpen(false); setEditing(null); setLoading(true); await fetchLojas() }}
      />
    </>
  )
}

// ─── Formulário padrão de loja ────────────────────────────────────────────────

const EMPTY: Omit<LojaFormData, 'ativo'> = {
  nome: '', codigo_pdv: '', canal: 'Varejo', cnpj: '',
  cep: '', logradouro: '', numero: '', complemento: '', cidade: '', estado: '',
}

function LojaModal({ open, initial, tenantId, onClose, onSaved }: {
  open: boolean; initial: Loja | null; tenantId: string
  onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<Omit<LojaFormData, 'ativo'>>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        nome:        initial.nome,
        codigo_pdv:  initial.codigo_pdv ?? '',
        canal:       initial.canal ?? 'Varejo',
        cnpj:        initial.cnpj ?? '',
        cep:         initial.cep ?? '',
        logradouro:  initial.logradouro ?? '',
        numero:      initial.numero ?? '',
        complemento: initial.complemento ?? '',
        cidade:      initial.cidade ?? '',
        estado:      initial.estado ?? '',
      } : EMPTY)
    }
  }, [open, initial])

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, estado: form.estado.toUpperCase().slice(0, 2) }
      const { error } = initial
        ? await LojasService.update(initial.id, payload)
        : await LojasService.create(tenantId, payload)
      if (error) throw error
      toast.success(initial ? 'Loja atualizada.' : 'Loja cadastrada.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={initial ? `Editar — ${initial.nome}` : 'Nova Loja'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="loja-form" type="submit" loading={saving}>
            {initial ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form id="loja-form" onSubmit={handleSubmit} className="space-y-5">

        {/* Identificação */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Identificação</p>
          <div className="space-y-3">
            <Input label="Nome da Loja *" value={form.nome}
              onChange={e => set('nome', e.target.value)} required
              placeholder="Ex: Boticário Shopping Morumbi" />

            {/* Canal */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Canal *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Varejo', 'Venda Direta'] as CanalLoja[]).map(c => (
                  <label key={c}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors
                      ${form.canal === c
                        ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                    <input type="radio" name="canal" value={c}
                      checked={form.canal === c} onChange={() => set('canal', c)}
                      className="accent-ank-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {c === 'Varejo' ? '🏪 Varejo' : '🚀 Venda Direta'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {c === 'Varejo' ? 'Loja física / Shopping' : 'Canal de revendedoras'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Código PDV" value={form.codigo_pdv ?? ''}
                onChange={e => set('codigo_pdv', e.target.value)}
                placeholder="Ex: 851424"
                hint="Deve corresponder ao 'Cod. PDV' nos arquivos de venda." />
              <Input label="CNPJ" value={form.cnpj ?? ''}
                onChange={e => set('cnpj', e.target.value)}
                placeholder="00.000.000/0001-00" />
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Endereço</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input label="CEP" value={form.cep ?? ''}
                onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
              <div className="col-span-2">
                <Input label="Rua / Logradouro" value={form.logradouro ?? ''}
                  onChange={e => set('logradouro', e.target.value)} placeholder="Av. Paulista" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Número" value={form.numero ?? ''}
                onChange={e => set('numero', e.target.value)} placeholder="1234" />
              <Input label="Complemento" value={form.complemento ?? ''}
                onChange={e => set('complemento', e.target.value)} placeholder="Loja 42" />
              <Input label="Cidade" value={form.cidade ?? ''}
                onChange={e => set('cidade', e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="w-24">
              <Input label="UF" value={form.estado ?? ''}
                onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP" />
            </div>
          </div>
        </section>
      </form>
    </Modal>
  )
}
