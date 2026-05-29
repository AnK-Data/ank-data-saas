import { useEffect, useState, type FormEvent } from 'react'
import { format, parseISO, addMonths, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PlusIcon, PencilSquareIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { LicensesService } from '../../services/licenses.service'
import { TenantsService } from '../../services/tenants.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { LicenseBadge } from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import type { License, LicenseStatus, Tenant } from '../../types'

type LicenseRow = License & { tenant?: { id: string; nome_franquia: string; codigo_cp: string | null } }

const brl = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS_OPTIONS: { value: LicenseStatus; label: string }[] = [
  { value: 'ACTIVE',    label: 'Ativa' },
  { value: 'ALERT',     label: 'Alerta' },
  { value: 'CRITICAL',  label: 'Crítica' },
  { value: 'EXPIRED',   label: 'Expirada' },
  { value: 'SUSPENDED', label: 'Suspensa' },
]

function diasRestantes(dataFim: string) {
  return differenceInDays(parseISO(dataFim), new Date())
}

function DaysLabel({ dataFim }: { dataFim: string }) {
  const d = diasRestantes(dataFim)
  if (d < 0)  return <span className="text-red-600 font-semibold">{Math.abs(d)}d expirado</span>
  if (d === 0) return <span className="text-orange-600 font-semibold">Vence hoje</span>
  return <span className={d <= 7 ? 'text-orange-600 font-semibold' : 'text-slate-600'}>{d}d</span>
}

export default function LicensesPage() {
  const [licenses, setLicenses]   = useState<LicenseRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing]     = useState<LicenseRow | null>(null)
  const [toggling, setToggling]   = useState<string | null>(null)

  async function fetchLicenses() {
    const { data, error } = await LicensesService.list()
    if (!error && data) setLicenses(data as LicenseRow[])
    setLoading(false)
  }

  useEffect(() => { fetchLicenses() }, [])

  async function toggleStatus(lic: LicenseRow) {
    const next: LicenseStatus = lic.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
    setToggling(lic.id)
    const { error } = await LicensesService.setStatus(lic.id, next)
    if (error) toast.error('Erro ao alterar status.')
    else toast.success(`Licença ${next === 'ACTIVE' ? 'ativada' : 'suspensa'}.`)
    await fetchLicenses()
    setToggling(null)
  }

  if (loading) return <Spinner fullScreen />

  return (
    <>
      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100">
          <CardHeader
            title="Controle de Licenciamento"
            subtitle="Vigências contratuais das franquias"
            action={
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                Nova Licença
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-3">Franquia</th>
                <th className="px-6 py-3">Cód. CP</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Meses</th>
                <th className="px-6 py-3 text-right">Dias Rest.</th>
                <th className="px-6 py-3 text-right">Valor Total</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">Nenhuma licença cadastrada.</td></tr>
              ) : licenses.map(lic => (
                <tr key={lic.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {lic.tenant?.nome_franquia ?? lic.tenant_id}
                  </td>
                  <td className="px-6 py-4">
                    {lic.tenant?.codigo_cp
                      ? <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{lic.tenant.codigo_cp}</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-4"><LicenseBadge status={lic.status} /></td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {format(parseISO(lic.data_fim_ciclo), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{lic.meses_contrato ?? '—'}</td>
                  <td className="px-6 py-4 text-right"><DaysLabel dataFim={lic.data_fim_ciclo} /></td>
                  <td className="px-6 py-4 text-right text-slate-600">{brl(lic.valor_contrato)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" loading={toggling === lic.id}
                        leftIcon={lic.status === 'SUSPENDED' ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                        onClick={() => toggleStatus(lic)}>
                        {lic.status === 'SUSPENDED' ? 'Ativar' : 'Suspender'}
                      </Button>
                      <Button variant="ghost" size="sm" leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                        onClick={() => setEditing(lic)}>
                        Editar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateLicenseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={async () => { setCreateOpen(false); setLoading(true); await fetchLicenses() }}
      />

      <EditLicenseModal
        open={editing !== null} license={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); setLoading(true); await fetchLicenses() }}
      />
    </>
  )
}

// ─── Modal: Criar licença ─────────────────────────────────────────────────────

function CreateLicenseModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const [tenants, setTenants]     = useState<Pick<Tenant, 'id' | 'nome_franquia' | 'codigo_cp'>[]>([])
  const [tenantId, setTenantId]   = useState('')
  const [meses, setMeses]         = useState(12)
  const [valorMensal, setValorMensal] = useState('')
  const [saving, setSaving]       = useState(false)
  const [preview, setPreview]     = useState('')

  useEffect(() => {
    if (open) {
      TenantsService.listActive().then(({ data }) => {
        setTenants((data ?? []) as Pick<Tenant, 'id' | 'nome_franquia' | 'codigo_cp'>[])
      })
      setTenantId(''); setMeses(12); setValorMensal('')
    }
  }, [open])

  useEffect(() => {
    setPreview(format(addMonths(new Date(), meses), "dd/MM/yyyy", { locale: ptBR }))
  }, [meses])

  const valorMensalNum = valorMensal ? parseFloat(valorMensal.replace(',', '.')) : null
  const valorTotal     = valorMensalNum != null ? valorMensalNum * meses : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tenantId) { toast.error('Selecione uma franquia.'); return }
    setSaving(true)
    try {
      const { error } = await LicensesService.create({
        tenant_id:    tenantId,
        meses_contrato: meses,
        valor_mensal: valorMensalNum,
      })
      if (error) throw error
      toast.success('Licença criada com status ACTIVE.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar licença.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Licença Contratual"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="create-lic" type="submit" loading={saving}>Criar Licença</Button>
        </>
      }
    >
      <form id="create-lic" onSubmit={handleSubmit} className="space-y-4">
        {/* Franquia */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Franquia *</label>
          <select value={tenantId} onChange={e => setTenantId(e.target.value)} required
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200">
            <option value="">Selecione…</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.nome_franquia}{t.codigo_cp ? ` (CP: ${t.codigo_cp})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Meses */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Meses de Contrato *</label>
          <input type="number" min={1} max={60} value={meses}
            onChange={e => setMeses(Number(e.target.value))} required
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
          <p className="text-xs text-slate-500">Vencimento calculado: <strong>{preview}</strong></p>
        </div>

        {/* Valor mensal */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Valor Mensal (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
            <input type="number" min={0} step="0.01" value={valorMensal}
              onChange={e => setValorMensal(e.target.value)} placeholder="0,00"
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
          </div>
        </div>

        {/* Resumo do valor total */}
        {valorTotal != null && (
          <div className="rounded-lg bg-ank-50 border border-ank-200 px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Valor mensal:</span>
              <span className="font-medium">{brl(valorMensalNum)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-600">Duração:</span>
              <span className="font-medium">{meses} meses</span>
            </div>
            <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-ank-200">
              <span className="text-ank-800">Valor total do contrato:</span>
              <span className="text-ank-700">{brl(valorTotal)}</span>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-700">
          Status inicial: <strong>ACTIVE</strong> · Vigência: hoje → {preview}
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal: Editar licença ────────────────────────────────────────────────────

function EditLicenseModal({ open, license, onClose, onSaved }: {
  open: boolean; license: LicenseRow | null; onClose: () => void; onSaved: () => void
}) {
  const [status, setStatus]   = useState<LicenseStatus>('ACTIVE')
  const [dataFim, setDataFim] = useState('')
  const [valor, setValor]     = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (open && license) {
      setStatus(license.status)
      setDataFim(license.data_fim_ciclo)
      setValor(license.valor_contrato?.toString() ?? '')
    }
  }, [open, license])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!license) return
    setSaving(true)
    try {
      const { error } = await LicensesService.update(license.id, {
        status,
        data_fim_ciclo: dataFim,
        valor_contrato: valor ? parseFloat(valor) : null,
      })
      if (error) throw error
      toast.success('Licença atualizada.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={`Editar — ${license?.tenant?.nome_franquia ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="edit-lic" type="submit" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="edit-lic" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as LicenseStatus)}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="text-xs text-slate-500">EXPIRADA ou SUSPENSA bloqueia o acesso imediatamente.</p>
        </div>

        <Input label="Data de Vencimento" type="date" value={dataFim}
          onChange={e => setDataFim(e.target.value)} required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Valor Total do Contrato (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
            <input type="number" min={0} step="0.01" value={valor}
              onChange={e => setValor(e.target.value)} placeholder="0,00"
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
          </div>
        </div>
      </form>
    </Modal>
  )
}
