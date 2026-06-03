import { useEffect, useState, type FormEvent } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PlusIcon, FolderIcon, PencilSquareIcon,
  NoSymbolIcon, CheckCircleIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { TenantsService } from '../../services/tenants.service'
import { LicensesService } from '../../services/licenses.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { LicenseBadge } from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import type { Tenant, TenantFormData, License } from '../../types'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState<Tenant | null>(null)
  const [licenseModal, setLicenseModal] = useState<Tenant | null>(null)
  const [toggling, setToggling]         = useState<string | null>(null)

  async function fetchTenants() {
    const { data, error } = await TenantsService.list()
    if (!error && data) setTenants(data as Tenant[])
    setLoading(false)
  }

  useEffect(() => { fetchTenants() }, [])

  async function handleToggle(tenant: Tenant) {
    setToggling(tenant.id)
    const fn = tenant.ativo ? TenantsService.deactivate : TenantsService.activate
    const { error } = await fn(tenant.id)
    if (error) toast.error('Erro ao alterar status.')
    else toast.success(tenant.ativo ? 'Franquia desativada.' : 'Franquia ativada.')
    await fetchTenants()
    setToggling(null)
  }

  if (loading) return <Spinner fullScreen />

  const ativas   = tenants.filter(t => t.ativo).length
  const inativas = tenants.filter(t => !t.ativo).length

  return (
    <>
      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60">
          <CardHeader
            title="Gerenciamento de Franquias"
            subtitle={`${ativas} ativa${ativas !== 1 ? 's' : ''} · ${inativas} inativa${inativas !== 1 ? 's' : ''}`}
            action={
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => { setEditing(null); setModalOpen(true) }}>
                Nova Franquia
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-6 py-3">Nome da Franquia</th>
                <th className="px-6 py-3">Código CP</th>
                <th className="px-6 py-3">Google Drive ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Criada em</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {tenants.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Nenhuma franquia cadastrada.</td></tr>
              ) : tenants.map(t => (
                <tr key={t.id} className={`transition-colors ${!t.ativo ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{t.nome_franquia}</td>
                  <td className="px-6 py-4">
                    {t.codigo_cp
                      ? <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{t.codigo_cp}</span>
                      : <span className="text-slate-400 italic text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {t.google_drive_folder_id
                      ? <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                          <FolderIcon className="h-3.5 w-3.5 text-ank-500" />
                          {t.google_drive_folder_id.slice(0, 20)}…
                        </span>
                      : <span className="text-slate-400 italic text-xs">Não configurado</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset
                      ${t.ativo ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-500 ring-slate-300'}`}>
                      {t.ativo ? '● Ativa' : '○ Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {format(parseISO(t.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" leftIcon={<DocumentTextIcon className="h-4 w-4" />}
                        onClick={() => setLicenseModal(t)}>Licença</Button>
                      <Button variant="ghost" size="sm" leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                        onClick={() => { setEditing(t); setModalOpen(true) }}>Editar</Button>
                      <Button variant="ghost" size="sm" loading={toggling === t.id}
                        leftIcon={t.ativo
                          ? <NoSymbolIcon className="h-4 w-4 text-red-500" />
                          : <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
                        onClick={() => handleToggle(t)}>
                        {t.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <TenantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        onSaved={async () => { setModalOpen(false); setEditing(null); setLoading(true); await fetchTenants() }}
      />

      {licenseModal && (
        <LicenseViewModal tenant={licenseModal} onClose={() => setLicenseModal(null)} />
      )}
    </>
  )
}

// ─── Modal Criar/Editar ───────────────────────────────────────────────────────

function TenantModal({ open, onClose, initial, onSaved }: {
  open: boolean; onClose: () => void; initial: Tenant | null; onSaved: () => void
}) {
  const [form, setForm]     = useState<TenantFormData>({ nome_franquia: '', codigo_cp: '', google_drive_folder_id: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<TenantFormData>>({})

  useEffect(() => {
    if (open) {
      setForm({
        nome_franquia:          initial?.nome_franquia ?? '',
        codigo_cp:              initial?.codigo_cp ?? '',
        google_drive_folder_id: initial?.google_drive_folder_id ?? '',
      })
      setErrors({})
    }
  }, [open, initial])

  function validate() {
    const e: Partial<TenantFormData> = {}
    if (!form.nome_franquia.trim()) e.nome_franquia = 'Nome obrigatório.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (initial) {
        const { error } = await TenantsService.update(initial.id, form)
        if (error) throw error
        toast.success('Franquia atualizada.')
      } else {
        const { error } = await TenantsService.create(form)
        if (error) throw error
        toast.success('Franquia cadastrada.')
      }
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={initial ? 'Editar Franquia' : 'Nova Franquia'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="tenant-form" type="submit" loading={saving}>
            {initial ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form id="tenant-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome da Franquia"
          value={form.nome_franquia}
          onChange={e => setForm(f => ({ ...f, nome_franquia: e.target.value }))}
          placeholder="Ex: Boticário – Shopping Morumbi"
          error={errors.nome_franquia}
          required
        />
        <Input
          label="Código CP (Código do PDV)"
          value={form.codigo_cp}
          onChange={e => setForm(f => ({ ...f, codigo_cp: e.target.value }))}
          placeholder="Ex: 851424"
          hint="Usado para cruzamento com os dados de vendas."
        />
        <Input
          label="Google Drive Folder ID"
          value={form.google_drive_folder_id}
          onChange={e => setForm(f => ({ ...f, google_drive_folder_id: e.target.value }))}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
          hint="ID da pasta onde os arquivos de venda são depositados."
        />
      </form>
    </Modal>
  )
}

// ─── Modal Visualizar Licença ─────────────────────────────────────────────────

function LicenseViewModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [license, setLicense] = useState<License | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    LicensesService.getByTenant(tenant.id).then(({ data }) => {
      setLicense(data as License | null)
      setLoading(false)
    })
  }, [tenant.id])

  const fmt = (d: string) => format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR })
  const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <Modal open onClose={onClose} title={`Licença — ${tenant.nome_franquia}`} size="sm"
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : !license ? (
        <p className="text-sm text-slate-500 text-center py-4">Nenhuma licença cadastrada para esta franquia.</p>
      ) : (
        <dl className="space-y-3">
          {(() => {
            const dias = differenceInDays(parseISO(license.data_fim_ciclo), new Date())
            return (
              <>
                <Row label="Status"><LicenseBadge status={license.status} /></Row>
                <Row label="Vencimento">{fmt(license.data_fim_ciclo)}</Row>
                <Row label="Dias Restantes">
                  <span className={dias < 0 ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                    {dias < 0 ? `${Math.abs(dias)}d expirado` : `${dias}d`}
                  </span>
                </Row>
                {license.meses_contrato && <Row label="Meses">{license.meses_contrato} meses</Row>}
                {license.valor_contrato != null && <Row label="Valor Total">{brl(license.valor_contrato)}</Row>}
              </>
            )
          })()}
        </dl>
      )}
    </Modal>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700/60 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{children}</dd>
    </div>
  )
}
