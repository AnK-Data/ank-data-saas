import { useEffect, useState, useRef, type FormEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  EyeIcon, PlusIcon, ArrowPathIcon, XMarkIcon,
  DocumentArrowUpIcon, DocumentArrowDownIcon,
  CheckCircleIcon, PaperAirplaneIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusContrato = 'rascunho' | 'enviado' | 'assinado' | 'cancelado'

interface Contrato {
  id: string
  tenant_id: string | null
  template_id: string | null
  titulo: string
  status: StatusContrato
  arquivo_url: string | null
  obs: string | null
  criado_por: string | null
  created_at: string
  enviado_at: string | null
  assinado_at: string | null
  tenant?: { nome_franquia: string } | null
}

interface Template {
  id: string
  titulo: string
  descricao: string | null
  corpo: string | null
  ativo: boolean
  created_at: string
}

// ─── Config de status ─────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusContrato, { label: string; badge: string }> = {
  rascunho:  { label: 'Rascunho',  badge: 'bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-400'         },
  enviado:   { label: 'Enviado',   badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400'            },
  assinado:  { label: 'Assinado',  badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'},
  cancelado: { label: 'Cancelado', badge: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400'                 },
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ContratosPage() {
  const { user } = useAuth()
  const [tab, setTab]               = useState<'contratos' | 'templates'>('contratos')
  const [contratos, setContratos]   = useState<Contrato[]>([])
  const [templates, setTemplates]   = useState<Template[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Contrato | null>(null)
  const [addModal, setAddModal]     = useState<'contrato' | 'template' | null>(null)

  async function fetchAll() {
    const [c, t] = await Promise.all([
      supabase.from('contratos')
        .select('*, tenant:tenants(nome_franquia)')
        .order('created_at', { ascending: false }),
      supabase.from('contrato_templates')
        .select('*').order('created_at', { ascending: false }),
    ])
    setContratos((c.data ?? []) as Contrato[])
    setTemplates((t.data ?? []) as Template[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Contratos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie contratos por cliente e templates reutilizáveis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm"
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            onClick={() => { setLoading(true); fetchAll() }}>
            Atualizar
          </Button>
          <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setAddModal(tab === 'contratos' ? 'contrato' : 'template')}>
            {tab === 'contratos' ? 'Novo Contrato' : 'Novo Template'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {([
          ['contratos', `Contratos (${contratos.length})`],
          ['templates', `Templates (${templates.length})`],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === id
                ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
            <DocumentTextIcon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Lista de Contratos ───────────────────────────────────── */}
      {tab === 'contratos' && (
        <div className="space-y-2">
          {contratos.length === 0 ? (
            <Empty label="Nenhum contrato ainda" sub="Crie o primeiro contrato clicando em 'Novo Contrato'." />
          ) : contratos.map(c => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.rascunho
            return (
              <div key={c.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-900 px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.titulo}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                    {c.tenant?.nome_franquia && (
                      <span className="font-medium text-slate-500 dark:text-slate-400">{c.tenant.nome_franquia}</span>
                    )}
                    <span>Criado em {format(parseISO(c.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    {c.assinado_at && (
                      <span className="text-emerald-600">
                        · Assinado {format(parseISO(c.assinado_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelected(c)}
                  className="p-2 rounded-xl text-slate-400 hover:text-ank-600 dark:hover:text-ank-400
                    hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors"
                  title="Ver contrato">
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Lista de Templates ───────────────────────────────────── */}
      {tab === 'templates' && (
        <div className="space-y-2">
          {templates.length === 0 ? (
            <Empty label="Nenhum template ainda" sub="Crie templates reutilizáveis para agilizar a geração de contratos." />
          ) : templates.map(t => (
            <div key={t.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-900 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.titulo}</p>
                {t.descricao && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t.descricao}</p>}
                <p className="text-[10px] text-slate-400 mt-1">
                  Criado {format(parseISO(t.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  {!t.ativo && <span className="ml-2 text-slate-300">· Inativo</span>}
                </p>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
                ${t.ativo ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-300'}`}>
                {t.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Painel de detalhe do contrato */}
      {selected && (
        <ContratoPainel
          contrato={selected}
          onClose={() => setSelected(null)}
          onUpdated={async () => { setSelected(null); setLoading(true); await fetchAll() }}
        />
      )}

      {/* Modais de criação */}
      {addModal === 'contrato' && (
        <NovoContratoModal
          templates={templates}
          userId={user?.id ?? ''}
          onClose={() => setAddModal(null)}
          onSaved={async () => { setAddModal(null); setLoading(true); await fetchAll() }}
        />
      )}
      {addModal === 'template' && (
        <NovoTemplateModal
          userId={user?.id ?? ''}
          onClose={() => setAddModal(null)}
          onSaved={async () => { setAddModal(null); setLoading(true); await fetchAll() }}
        />
      )}
    </div>
  )
}

// ─── Painel de detalhe (slide-in) ─────────────────────────────────────────────

function ContratoPainel({ contrato, onClose, onUpdated }: {
  contrato: Contrato; onClose: () => void; onUpdated: () => void
}) {
  const [uploading, setUploading]   = useState(false)
  const [updating,  setUpdating]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const cfg = STATUS_CFG[contrato.status] ?? STATUS_CFG.rascunho

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 10MB).'); return }

    setUploading(true)
    try {
      const path = `${contrato.id}/${file.name}`
      const { error: upErr } = await supabase.storage.from('contratos').upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('contratos').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('contratos')
        .update({ arquivo_url: data.publicUrl, status: 'enviado', enviado_at: new Date().toISOString() })
        .eq('id', contrato.id)
      if (dbErr) throw dbErr

      toast.success('Contrato enviado!')
      onUpdated()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar.')
    } finally { setUploading(false) }
  }

  async function setStatus(status: StatusContrato) {
    setUpdating(true)
    const extra: Record<string, string> = {}
    if (status === 'assinado') extra.assinado_at = new Date().toISOString()
    if (status === 'enviado')  extra.enviado_at  = new Date().toISOString()

    const { error } = await supabase.from('contratos').update({ status, ...extra }).eq('id', contrato.id)
    if (error) { toast.error(error.message); setUpdating(false); return }
    toast.success(`Contrato marcado como ${STATUS_CFG[status].label.toLowerCase()}.`)
    onUpdated()
  }

  async function downloadArquivo() {
    if (!contrato.arquivo_url) return
    window.open(contrato.arquivo_url, '_blank')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg
        bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700
        flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{contrato.titulo}</p>
            {contrato.tenant?.nome_franquia && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {contrato.tenant.nome_franquia}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-slate-400">
                Criado {format(parseISO(contrato.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Upload do contrato assinado */}
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                bg-ank-50 dark:bg-ank-950/30">
                <DocumentArrowUpIcon className="h-5 w-5 text-ank-600 dark:text-ank-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Upload do contrato assinado
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  PDF, JPG ou PNG · Máx. 10MB
                </p>
              </div>
            </div>

            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={handleUpload} />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-600
                px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300
                hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              {uploading ? 'Enviando…' : contrato.arquivo_url ? '↺ Substituir arquivo' : '📎 Selecionar arquivo'}
            </button>

            {contrato.arquivo_url && (
              <button onClick={downloadArquivo}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl
                  bg-ank-50 dark:bg-ank-950/30 border border-ank-200 dark:border-ank-800
                  px-4 py-2.5 text-sm font-medium text-ank-700 dark:text-ank-400 hover:opacity-80 transition-opacity">
                <DocumentArrowDownIcon className="h-4 w-4" />
                Baixar contrato assinado
              </button>
            )}
          </div>

          {/* Datas */}
          {(contrato.enviado_at || contrato.assinado_at) && (
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              {contrato.enviado_at && (
                <p>📤 Enviado em {format(parseISO(contrato.enviado_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              )}
              {contrato.assinado_at && (
                <p className="text-emerald-600 dark:text-emerald-400">
                  ✅ Assinado em {format(parseISO(contrato.assinado_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {/* Obs */}
          {contrato.obs && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
              {contrato.obs}
            </div>
          )}
        </div>

        {/* Footer com ações de status */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 space-y-2 shrink-0
          bg-slate-50 dark:bg-slate-900/50">

          <div className="grid grid-cols-2 gap-2">
            {contrato.status !== 'enviado' && contrato.status !== 'cancelado' && (
              <button onClick={() => setStatus('enviado')} disabled={updating}
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 dark:border-blue-800
                  px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-400
                  hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-50">
                <PaperAirplaneIcon className="h-4 w-4" />
                Marcar como enviado
              </button>
            )}
            {contrato.status !== 'assinado' && contrato.status !== 'cancelado' && (
              <button onClick={() => setStatus('assinado')} disabled={updating}
                className="flex items-center justify-center gap-2 rounded-xl
                  bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white
                  transition-colors disabled:opacity-50">
                <CheckCircleIcon className="h-4 w-4" />
                Marcar como assinado
              </button>
            )}
          </div>

          {contrato.status !== 'cancelado' && (
            <button onClick={() => setStatus('cancelado')} disabled={updating}
              className="w-full rounded-xl border border-red-200 dark:border-red-800
                px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50">
              Cancelar contrato
            </button>
          )}

          <button onClick={onClose}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700
              px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Modais de criação ────────────────────────────────────────────────────────

function NovoContratoModal({ templates, userId, onClose, onSaved }: {
  templates: Template[]; userId: string; onClose: () => void; onSaved: () => void
}) {
  const [titulo,     setTitulo]     = useState('')
  const [tenantId,   setTenantId]   = useState('')
  const [templateId, setTemplateId] = useState('')
  const [obs,        setObs]        = useState('')
  const [tenants,    setTenants]    = useState<{ id: string; nome_franquia: string }[]>([])
  const [saving,     setSaving]     = useState(false)
  const [arquivo,    setArquivo]    = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('tenants').select('id, nome_franquia').eq('ativo', true).order('nome_franquia')
      .then(({ data }) => setTenants((data ?? []) as { id: string; nome_franquia: string }[]))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { toast.error('Título obrigatório.'); return }
    setSaving(true)
    try {
      // 1. Cria o registro do contrato
      const { data: contrato, error: cErr } = await supabase.from('contratos').insert({
        titulo:      titulo.trim(),
        tenant_id:   tenantId   || null,
        template_id: templateId || null,
        obs:         obs.trim() || null,
        criado_por:  userId,
        status:      arquivo ? 'enviado' : 'rascunho',
        enviado_at:  arquivo ? new Date().toISOString() : null,
      }).select().single()
      if (cErr) throw cErr

      // 2. Se há arquivo, faz upload no Storage
      if (arquivo && contrato) {
        const path = `${contrato.id}/${arquivo.name}`
        const { error: upErr } = await supabase.storage
          .from('contratos').upload(path, arquivo, { upsert: true })
        if (upErr) throw upErr

        const { data: urlData } = supabase.storage.from('contratos').getPublicUrl(path)
        await supabase.from('contratos')
          .update({ arquivo_url: urlData.publicUrl })
          .eq('id', contrato.id)
      }

      toast.success(arquivo ? 'Contrato criado e PDF enviado!' : 'Contrato criado.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl
        ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Novo Contrato</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto max-h-[75vh]">
          <Input label="Título do contrato *" value={titulo} onChange={e => setTitulo(e.target.value)} required
            placeholder="Ex: Contrato AnK Data — CP Manoel 2026" />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cliente (Franquia)</label>
            <select value={tenantId} onChange={e => setTenantId(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
              <option value="">Sem vínculo</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.nome_franquia}</option>)}
            </select>
          </div>

          {templates.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Template base</label>
              <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                <option value="">Sem template</option>
                {templates.filter(t => t.ativo).map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm resize-none" />
          </div>

          {/* Upload do PDF */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Upload do contrato (PDF)
              <span className="ml-1.5 text-xs text-slate-400 font-normal">opcional</span>
            </label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 10MB).'); return }
                setArquivo(f)
              }} />

            {arquivo ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200
                dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">📄</span>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 truncate">
                    {arquivo.name}
                  </p>
                  <span className="text-xs text-emerald-600 dark:text-emerald-500 shrink-0">
                    {(arquivo.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
                <button type="button" onClick={() => { setArquivo(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors shrink-0">
                  Remover
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-dashed
                  border-slate-300 dark:border-slate-600 px-4 py-4 text-sm
                  text-slate-500 dark:text-slate-400 hover:border-ank-400 hover:text-ank-600
                  dark:hover:border-ank-500 dark:hover:text-ank-400 transition-colors">
                <DocumentArrowUpIcon className="h-5 w-5" />
                Clique para selecionar o PDF do contrato
              </button>
            )}

            <p className="text-[10px] text-slate-400">
              PDF, JPG ou PNG · Máx. 10MB.
              {arquivo ? ' O contrato será criado com status "Enviado".' : ' Se omitido, o contrato fica como "Rascunho".'}
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {arquivo ? 'Criar e Enviar PDF' : 'Criar contrato'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NovoTemplateModal({ userId: _userId, onClose, onSaved }: {
  userId: string; onClose: () => void; onSaved: () => void
}) {
  const [titulo,    setTitulo]    = useState('')
  const [descricao, setDescricao] = useState('')
  const [corpo,     setCorpo]     = useState('')
  const [saving,    setSaving]    = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('contrato_templates').insert({
        titulo: titulo.trim(), descricao: descricao.trim() || null, corpo: corpo.trim() || null,
      })
      if (error) throw error
      toast.success('Template criado.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl
        ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Novo Template</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form id="template-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <Input label="Título *" value={titulo} onChange={e => setTitulo(e.target.value)} required
            placeholder="Ex: Template padrão AnK Data v1" />
          <Input label="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder="Uso, versão ou observação sobre o template" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Corpo do contrato (Markdown)
            </label>
            <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={10}
              placeholder="# CONTRATO DE PRESTAÇÃO DE SERVIÇOS&#10;&#10;## QUALIFICAÇÃO DAS PARTES&#10;..."
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                px-3 py-2.5 text-sm font-mono resize-y" />
            <p className="text-[10px] text-slate-400">Suporta Markdown. Use {'{{variavel}}'} para placeholders.</p>
          </div>
        </form>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancelar</Button>
          <Button form="template-form" type="submit" loading={saving} className="flex-1">
            Criar template
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────

function Empty({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center
      rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
      <DocumentTextIcon className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
      <p className="font-medium text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">{sub}</p>
    </div>
  )
}
