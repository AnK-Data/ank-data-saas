import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react'
import * as XLSX from 'xlsx'
import {
  PlusIcon, PencilSquareIcon,
  CheckCircleIcon, NoSymbolIcon,
  BuildingStorefrontIcon, ArrowUpTrayIcon, CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  LojasService, type Loja, type LojaFormData, type CanalLoja, type CanalOpcao,
  CANAIS_OPCOES, canaisParaCanalLoja, canalLojaParaOpcoes,
} from '../../services/lojas.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

// ─── Badges ──────────────────────────────────────────────────────────────────

function CanalBadge({ canal }: { canal: CanalLoja }) {
  if (canal === 'Híbrido') return (
    <div className="flex gap-1 flex-wrap">
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">🏪 Varejo</span>
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20">🚀 VD</span>
    </div>
  )
  return canal === 'Varejo'
    ? <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">🏪 Varejo</span>
    : <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20">🚀 Venda Direta</span>
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LojasPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? ''

  const [lojas, setLojas]         = useState<Loja[]>([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Loja | null>(null)
  const [toggling, setToggling]   = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

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

  const ativas  = lojas.filter(l => l.ativo).length
  const varejo  = lojas.filter(l => l.canal === 'Varejo'  || l.canal === 'Híbrido').length
  const vd      = lojas.filter(l => l.canal === 'Venda Direta' || l.canal === 'Híbrido').length
  const hibrido = lojas.filter(l => l.canal === 'Híbrido').length

  return (
    <>
      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Lojas ativas', value: ativas,  color: 'text-emerald-600' },
          { label: 'Varejo',       value: varejo,  color: 'text-blue-600'    },
          { label: 'Venda Direta', value: vd,      color: 'text-violet-600'  },
          { label: 'Híbridas',     value: hibrido, color: 'text-amber-600'   },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-800">
          <CardHeader
            title="Lojas / PDVs"
            subtitle={`${lojas.length} loja${lojas.length !== 1 ? 's' : ''} cadastrada${lojas.length !== 1 ? 's' : ''}`}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm"
                  leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
                  onClick={() => setUploadOpen(true)}>
                  Upload Lista
                </Button>
                <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
                  onClick={() => { setEditing(null); setModalOpen(true) }}>
                  Nova Loja
                </Button>
              </div>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3">Nome da Loja</th>
                <th className="px-5 py-3">Canal</th>
                <th className="px-5 py-3">Nicho</th>
                <th className="px-5 py-3">Cluster</th>
                <th className="px-5 py-3">Cód. PDV</th>
                <th className="px-5 py-3">CNPJ</th>
                <th className="px-5 py-3">Cidade / UF</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 dark:divide-slate-800">
              {lojas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <BuildingStorefrontIcon className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-600 dark:text-slate-400">Nenhuma loja cadastrada</p>
                      <p className="text-xs text-slate-400 max-w-xs text-center">
                        Cadastre manualmente ou faça o upload de uma planilha com a lista de lojas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : lojas.map(loja => (
                <tr key={loja.id}
                  className={`transition-colors ${!loja.ativo ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50'}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">{loja.nome}</td>
                  <td className="px-5 py-3.5"><CanalBadge canal={loja.canal} /></td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-xs">
                    {loja.nicho || <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {loja.cluster
                      ? <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-amber-600/20">
                          {loja.cluster}
                        </span>
                      : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {loja.codigo_pdv
                      ? <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{loja.codigo_pdv}</span>
                      : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-mono">
                    {loja.cnpj || <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                    {loja.cidade && loja.estado ? `${loja.cidade} / ${loja.estado}` : loja.cidade || <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset
                      ${loja.ativo
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 ring-slate-300 dark:bg-slate-800 dark:text-slate-500'}`}>
                      {loja.ativo ? '● Ativa' : '○ Inativa'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                        onClick={() => { setEditing(loja); setModalOpen(true) }}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" loading={toggling === loja.id}
                        leftIcon={loja.ativo ? <NoSymbolIcon className="h-4 w-4 text-red-500" /> : <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
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
        open={modalOpen} initial={editing} tenantId={tenantId}
        onClose={() => setModalOpen(false)}
        onSaved={async () => { setModalOpen(false); setEditing(null); setLoading(true); await fetchLojas() }}
      />

      <LojaUploadModal
        open={uploadOpen} tenantId={tenantId}
        onClose={() => setUploadOpen(false)}
        onSaved={async () => { setUploadOpen(false); setLoading(true); await fetchLojas() }}
      />
    </>
  )
}

// ─── Formulário base ─────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<LojaFormData, 'ativo'> = {
  nome: '', codigo_pdv: '', canal: 'Varejo', nicho: '', cluster: '',
  cnpj: '', cep: '', logradouro: '', numero: '', complemento: '', cidade: '', estado: '',
}

// ─── Modal: Criar / Editar ────────────────────────────────────────────────────

function LojaModal({ open, initial, tenantId, onClose, onSaved }: {
  open: boolean; initial: Loja | null; tenantId: string
  onClose: () => void; onSaved: () => void
}) {
  const [form, setForm]         = useState<Omit<LojaFormData, 'ativo'>>(EMPTY_FORM)
  const [canais, setCanais]     = useState<CanalOpcao[]>(['Varejo'])
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          nome: initial.nome, codigo_pdv: initial.codigo_pdv ?? '',
          canal: initial.canal, nicho: initial.nicho ?? '', cluster: initial.cluster ?? '',
          cnpj: initial.cnpj ?? '', cep: initial.cep ?? '',
          logradouro: initial.logradouro ?? '', numero: initial.numero ?? '',
          complemento: initial.complemento ?? '', cidade: initial.cidade ?? '',
          estado: initial.estado ?? '',
        })
        setCanais(canalLojaParaOpcoes(initial.canal))
      } else {
        setForm(EMPTY_FORM); setCanais(['Varejo'])
      }
    }
  }, [open, initial])

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleCanal(c: CanalOpcao) {
    setCanais(prev => {
      const next = prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
      return next.length === 0 ? prev : next  // mínimo 1
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, canal: canaisParaCanalLoja(canais), estado: (form.estado ?? '').toUpperCase().slice(0, 2) }
      const { error } = initial
        ? await LojasService.update(initial.id, payload)
        : await LojasService.create(tenantId, payload)
      if (error) throw error
      toast.success(initial ? 'Loja atualizada.' : 'Loja cadastrada.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  const ambos = canais.length === 2

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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Identificação</p>
          <div className="space-y-3">
            <Input label="Nome da Loja *" value={form.nome} onChange={e => set('nome', e.target.value)} required
              placeholder="Ex: Boticário Shopping Morumbi" />

            {/* Canal */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Canal * <span className="text-xs text-slate-400 font-normal">(selecione um ou ambos)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CANAIS_OPCOES.map(c => (
                  <label key={c}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors
                      ${canais.includes(c) ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                    <input type="checkbox" checked={canais.includes(c)} onChange={() => toggleCanal(c)} className="accent-ank-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {c === 'Varejo' ? '🏪 Varejo' : '🚀 Venda Direta'}
                      </p>
                      <p className="text-[10px] text-slate-400">{c === 'Varejo' ? 'Loja física / Shopping' : 'Canal de revendedoras'}</p>
                    </div>
                  </label>
                ))}
              </div>
              {ambos && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ✦ Loja híbrida — aparecerá nos relatórios de Varejo e Venda Direta
                </p>
              )}
            </div>

            {/* Nicho + Cluster */}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nicho" value={form.nicho ?? ''}
                onChange={e => set('nicho', e.target.value)}
                placeholder="Ex: Perfumaria, Misto, Cosméticos"
                hint="Segmento principal de vendas da loja." />
              <Input label="Cluster" value={form.cluster ?? ''}
                onChange={e => set('cluster', e.target.value)}
                placeholder="Ex: Ouro, Prata, Bronze, A, B, C"
                hint="Classificação estratégica do PDV." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Código PDV" value={form.codigo_pdv ?? ''}
                onChange={e => set('codigo_pdv', e.target.value)}
                placeholder="Ex: 851424"
                hint="Deve corresponder ao 'Cod. PDV' nos arquivos de venda." />
              <Input label="CNPJ" value={form.cnpj ?? ''}
                onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Endereço</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input label="CEP" value={form.cep ?? ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
              <div className="col-span-2">
                <Input label="Rua / Logradouro" value={form.logradouro ?? ''} onChange={e => set('logradouro', e.target.value)} placeholder="Av. Paulista" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Número" value={form.numero ?? ''} onChange={e => set('numero', e.target.value)} placeholder="1234" />
              <Input label="Complemento" value={form.complemento ?? ''} onChange={e => set('complemento', e.target.value)} placeholder="Loja 42" />
              <Input label="Cidade" value={form.cidade ?? ''} onChange={e => set('cidade', e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="w-24">
              <Input label="UF" value={form.estado ?? ''} onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
            </div>
          </div>
        </section>
      </form>
    </Modal>
  )
}

// ─── Modal: Upload lista de lojas ─────────────────────────────────────────────

interface LojaImportRow {
  nome: string
  canal: CanalLoja
  nicho: string
  cluster: string
  codigo_pdv: string
  cnpj: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  cidade: string
  estado: string
}

const COL_MAP: Record<string, keyof LojaImportRow> = {
  'nome': 'nome', 'nomedalojapdv': 'nome', 'loja': 'nome',
  'canal': 'canal',
  'nicho': 'nicho', 'segmento': 'nicho',
  'cluster': 'cluster', 'classificacao': 'cluster',
  'codigopdv': 'codigo_pdv', 'codpdv': 'codigo_pdv', 'pdv': 'codigo_pdv', 'codigo': 'codigo_pdv',
  'cnpj': 'cnpj',
  'cep': 'cep',
  'logradouro': 'logradouro', 'rua': 'logradouro', 'endereco': 'logradouro',
  'numero': 'numero', 'num': 'numero',
  'complemento': 'complemento',
  'cidade': 'cidade',
  'estado': 'estado', 'uf': 'estado',
}

function normKey(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ\s_./-]/g, '')
}

function normalizeCanal(raw: string): CanalLoja {
  const v = raw.toLowerCase()
  if (v.includes('hibrido') || v.includes('ambos') || v.includes('híbrido')) return 'Híbrido'
  if (v.includes('venda') || v.includes('direta') || v.includes('vd'))       return 'Venda Direta'
  return 'Varejo'
}

function parseLojaFile(file: File): Promise<LojaImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb  = XLSX.read(e.target?.result, { type: 'array' })
        const ws  = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        if (!raw.length) { resolve([]); return }

        const headers = Object.keys(raw[0])
        const map: Partial<Record<keyof LojaImportRow, string>> = {}
        headers.forEach(h => {
          const field = COL_MAP[normKey(h)]
          if (field) map[field] = h
        })

        const rows: LojaImportRow[] = raw
          .map(r => ({
            nome:        String(r[map.nome ?? ''] ?? '').trim(),
            canal:       normalizeCanal(String(r[map.canal ?? ''] ?? '')),
            nicho:       String(r[map.nicho ?? ''] ?? '').trim(),
            cluster:     String(r[map.cluster ?? ''] ?? '').trim(),
            codigo_pdv:  String(r[map.codigo_pdv ?? ''] ?? '').trim(),
            cnpj:        String(r[map.cnpj ?? ''] ?? '').trim(),
            cep:         String(r[map.cep ?? ''] ?? '').trim(),
            logradouro:  String(r[map.logradouro ?? ''] ?? '').trim(),
            numero:      String(r[map.numero ?? ''] ?? '').trim(),
            complemento: String(r[map.complemento ?? ''] ?? '').trim(),
            cidade:      String(r[map.cidade ?? ''] ?? '').trim(),
            estado:      String(r[map.estado ?? ''] ?? '').trim().toUpperCase().slice(0, 2),
          }))
          .filter(r => r.nome)

        resolve(rows)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function LojaUploadModal({ open, tenantId, onClose, onSaved }: {
  open: boolean; tenantId: string; onClose: () => void; onSaved: () => void
}) {
  const [rows, setRows]         = useState<LojaImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting]   = useState(false)
  const [done, setDone]             = useState(false)
  const [result, setResult]         = useState({ ok: 0, err: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setRows([]); setFileName(''); setDone(false); setResult({ ok: 0, err: 0 }) }
  }, [open])

  const handleFile = useCallback(async (file: File) => {
    try {
      const parsed = await parseLojaFile(file)
      setRows(parsed); setFileName(file.name)
    } catch { toast.error('Erro ao ler o arquivo.') }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    try {
      const { data, error } = await LojasService.bulkCreate(tenantId, rows)
      if (error) throw error
      setResult({ ok: data?.length ?? rows.length, err: 0 })
      toast.success(`${data?.length ?? rows.length} loja${rows.length !== 1 ? 's' : ''} importada${rows.length !== 1 ? 's' : ''}!`)
      setDone(true)
      onSaved()
    } catch (err: unknown) {
      setResult({ ok: 0, err: rows.length })
      toast.error(err instanceof Error ? err.message : 'Erro na importação.')
      setDone(true)
    } finally { setImporting(false) }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Importar Lista de Lojas"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={importing}>Fechar</Button>
          {rows.length > 0 && !done && (
            <Button loading={importing} onClick={handleImport}
              leftIcon={<CloudArrowUpIcon className="h-4 w-4" />}>
              Importar {rows.length} loja{rows.length !== 1 ? 's' : ''}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">

        {/* Drop zone */}
        {rows.length === 0 && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                py-12 cursor-pointer text-center transition-all
                ${isDragging ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/30' : 'border-slate-300 dark:border-slate-700 hover:border-ank-400'}`}
            >
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
              <CloudArrowUpIcon className="h-10 w-10 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Arraste a planilha de lojas aqui</p>
              <p className="text-xs text-slate-400 mt-1">CSV, XLSX ou XLS</p>
            </div>

            {/* Colunas esperadas */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <p className="font-semibold mb-1">📋 Colunas esperadas (nomes flexíveis):</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {['Nome', 'Canal', 'Nicho', 'Cluster', 'Codigo PDV', 'CNPJ', 'CEP', 'Logradouro', 'Numero', 'Complemento', 'Cidade', 'UF'].map(c => (
                  <span key={c} className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded text-[10px]">{c}</span>
                ))}
              </div>
              <p className="mt-2">Canal aceita: <strong>Varejo</strong>, <strong>Venda Direta</strong> ou <strong>Híbrido</strong></p>
            </div>
          </>
        )}

        {/* Preview */}
        {rows.length > 0 && !done && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {rows.length} loja{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-slate-400">{fileName}</p>
              </div>
              <button onClick={() => { setRows([]); setFileName('') }}
                className="text-xs text-red-500 hover:text-red-700 transition-colors">
                Remover arquivo
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    {['Nome', 'Canal', 'Nicho', 'Cluster', 'PDV', 'Cidade/UF'].map(h => (
                      <th key={h} className="px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 dark:divide-slate-800">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r.nome}</td>
                      <td className="px-3 py-2 text-slate-500">{r.canal}</td>
                      <td className="px-3 py-2 text-slate-500">{r.nicho || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{r.cluster || '—'}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">{r.codigo_pdv || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {r.cidade && r.estado ? `${r.cidade}/${r.estado}` : r.cidade || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Resultado */}
        {done && (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">{result.err === 0 ? '✅' : '⚠️'}</p>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {result.ok} importada{result.ok !== 1 ? 's' : ''} com sucesso
              {result.err > 0 ? ` · ${result.err} com erro` : ''}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
