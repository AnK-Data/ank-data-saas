import { useEffect, useState, type FormEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PlusIcon, MegaphoneIcon, CheckCircleIcon,
  ExclamationTriangleIcon, InformationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { ComunicadosService, type Comunicado, type TipoComunicado } from '../../services/comunicados.service'
import { LojasService, type Loja } from '../../services/lojas.service'
import { PAPEL_LABELS } from '../../types'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

// ─── Config visual por tipo ───────────────────────────────────────────────────

const TIPO_CONFIG = {
  info:    { icon: InformationCircleIcon,  label: 'Informativo', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800' },
  aviso:   { icon: ExclamationTriangleIcon, label: 'Aviso',      color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
  urgente: { icon: ExclamationTriangleIcon, label: 'Urgente',    color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-200 dark:border-red-800' },
}

const CARGOS_OPCOES = Object.entries(PAPEL_LABELS)
  .filter(([k]) => !k.startsWith('ank_'))
  .map(([value, label]) => ({ value, label }))

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ComunicadosPage() {
  const { profile, user } = useAuth()
  const tenantId  = profile?.tenant_id ?? ''
  const userId    = user?.id ?? ''
  const isAdmin   = ['franqueado', 'sucessor', 'admin_franquia'].includes(profile?.papel ?? '')

  const [comunicados, setComunicados] = useState<Comunicado[]>([])
  const [lidos, setLidos]             = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<'todos' | 'nao_lidos'>('todos')
  const [search, setSearch]           = useState('')
  const [creating, setCreating]       = useState(false)
  const [viewing, setViewing]         = useState<Comunicado | null>(null)

  async function fetchData() {
    if (!tenantId) return
    const [{ data: comm }, { data: leituras }] = await Promise.all([
      ComunicadosService.list(tenantId, userId),
      ComunicadosService.getLidos(tenantId, userId),
    ])
    setComunicados((comm ?? []) as Comunicado[])
    setLidos(new Set((leituras ?? []).map((l: { comunicado_id: string }) => l.comunicado_id)))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [tenantId])

  async function marcarLido(id: string) {
    if (lidos.has(id)) return
    await ComunicadosService.marcarLido(id, userId)
    setLidos(prev => new Set([...prev, id]))
  }

  const filtered = comunicados.filter(c => {
    if (filter === 'nao_lidos' && lidos.has(c.id)) return false
    if (search && !c.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !(c.corpo ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const naoLidos = comunicados.filter(c => !lidos.has(c.id)).length

  if (loading) return <Spinner fullScreen />

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40">
              <MegaphoneIcon className="h-6 w-6 text-ank-600 dark:text-ank-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Comunicados</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {naoLidos > 0 ? `${naoLidos} não lido${naoLidos !== 1 ? 's' : ''}` : 'Tudo em dia'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Novo Comunicado
            </Button>
          )}
        </div>

        {/* Filtros + busca */}
        <Card>
          <div className="space-y-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou conteúdo…"
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800
                px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400
                focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200"
            />
            <div className="flex gap-2">
              {([['todos', `Todos ${comunicados.length}`], ['nao_lidos', `Não lidos ${naoLidos}`]] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors
                    ${filter === val
                      ? 'bg-ank-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MegaphoneIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-medium text-slate-600 dark:text-slate-400">
              {search ? 'Nenhum comunicado encontrado' : 'Nenhum comunicado ainda'}
            </p>
          </div>
        ) : filtered.map(c => {
          const cfg  = TIPO_CONFIG[c.tipo] ?? TIPO_CONFIG.info
          const Icon = cfg.icon
          const lido = lidos.has(c.id)

          return (
            <div key={c.id}
              className={`rounded-2xl border transition-all cursor-pointer
                ${lido
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  : `${cfg.bg} ${cfg.border} border-l-4`
                }`}
              onClick={() => { setViewing(c); marcarLido(c.id) }}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5
                    ${lido ? 'bg-slate-100 dark:bg-slate-800' : cfg.bg}`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {!lido && <span className="h-2 w-2 rounded-full bg-ank-500 shrink-0" />}
                      {!c.para_todos && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          • Segmentado
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${lido ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                      {c.titulo}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{c.corpo}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {format(parseISO(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {(c as Comunicado & { autor?: { nome: string } }).autor?.nome && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          · {(c as Comunicado & { autor?: { nome: string } }).autor!.nome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {lido && <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
                    {isAdmin && (
                      <button
                        onClick={async e => {
                          e.stopPropagation()
                          if (!confirm('Remover este comunicado?')) return
                          await ComunicadosService.delete(c.id)
                          toast.success('Comunicado removido.')
                          await fetchData()
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Visualizar comunicado */}
      {viewing && (
        <Modal open onClose={() => setViewing(null)} size="md"
          title={viewing.titulo}
          footer={<Button variant="secondary" onClick={() => setViewing(null)}>Fechar</Button>}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase ${TIPO_CONFIG[viewing.tipo]?.color}`}>
                {TIPO_CONFIG[viewing.tipo]?.label}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">
                {format(parseISO(viewing.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {viewing.corpo}
            </p>
            {!viewing.para_todos && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                <p className="font-semibold mb-1">Segmentação:</p>
                {viewing.papeis?.length > 0 && <p>Cargos: {viewing.papeis.map(p => PAPEL_LABELS[p as keyof typeof PAPEL_LABELS] ?? p).join(', ')}</p>}
                {viewing.canais?.length > 0 && <p>Canais: {viewing.canais.join(', ')}</p>}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Criar comunicado */}
      <CriarComunicadoModal
        open={creating}
        tenantId={tenantId}
        autorId={userId}
        lojas={[]}
        onClose={() => setCreating(false)}
        onSaved={async () => { setCreating(false); setLoading(true); await fetchData() }}
      />
    </>
  )
}

// ─── Modal: Criar Comunicado ──────────────────────────────────────────────────

function CriarComunicadoModal({ open, tenantId, autorId, onClose, onSaved }: {
  open: boolean; tenantId: string; autorId: string; lojas: Loja[]
  onClose: () => void; onSaved: () => void
}) {
  const [titulo, setTitulo]       = useState('')
  const [corpo, setCorpo]         = useState('')
  const [tipo, setTipo]           = useState<TipoComunicado>('info')
  const [paraТodos, setParaTodos] = useState(true)
  const [papeis, setPapeis]       = useState<string[]>([])
  const [canais, setCanais]       = useState<string[]>([])
  const [lojas, setLojas]         = useState<Loja[]>([])
  const [selectedLojas, setSelectedLojas] = useState<string[]>([])
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (open) {
      setTitulo(''); setCorpo(''); setTipo('info'); setParaTodos(true)
      setPapeis([]); setCanais([]); setSelectedLojas([])
      LojasService.list(tenantId).then(({ data }) => setLojas((data ?? []) as Loja[]))
    }
  }, [open, tenantId])

  function toggleItem<T>(arr: T[], item: T, setter: (v: T[]) => void) {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !corpo.trim()) { toast.error('Preencha título e corpo.'); return }
    setSaving(true)
    try {
      const { error } = await ComunicadosService.create(tenantId, autorId, {
        titulo: titulo.trim(), corpo: corpo.trim(), tipo,
        para_todos: paraТodos,
        papeis: paraТodos ? [] : papeis,
        lojas_ids: paraТodos ? [] : selectedLojas,
        canais: paraТodos ? [] : canais,
      })
      if (error) throw error
      toast.success('Comunicado enviado!')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Novo Comunicado"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="comunicado-form" type="submit" loading={saving}>Publicar</Button>
        </>
      }
    >
      <form id="comunicado-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Título *" value={titulo} onChange={e => setTitulo(e.target.value)} required
          placeholder="Ex: Reunião de equipe na próxima segunda-feira" />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mensagem *</label>
          <textarea value={corpo} onChange={e => setCorpo(e.target.value)} required rows={5}
            placeholder="Escreva o conteúdo do comunicado…"
            className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm resize-none
              focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
        </div>

        {/* Tipo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(TIPO_CONFIG) as [TipoComunicado, typeof TIPO_CONFIG.info][]).map(([val, cfg]) => (
              <button key={val} type="button" onClick={() => setTipo(val)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border-2 transition-colors
                  ${tipo === val ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <cfg.icon className="h-3.5 w-3.5" />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Segmentação */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Destinatários</label>
          <div className="flex gap-3">
            {[
              { val: true,  lbl: '👥 Todos os colaboradores' },
              { val: false, lbl: '🎯 Segmentado' },
            ].map(opt => (
              <label key={String(opt.val)}
                className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 cursor-pointer text-sm transition-colors flex-1
                  ${paraТodos === opt.val
                    ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30 text-ank-700 dark:text-ank-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                <input type="radio" checked={paraТodos === opt.val} onChange={() => setParaTodos(opt.val)} className="accent-ank-600" />
                {opt.lbl}
              </label>
            ))}
          </div>

          {!paraТodos && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {/* Por canal */}
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Por Canal</p>
                <div className="flex gap-2">
                  {['Varejo', 'Venda Direta'].map(c => (
                    <label key={c}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 cursor-pointer text-xs transition-colors
                        ${canais.includes(c) ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30 text-ank-700' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      <input type="checkbox" checked={canais.includes(c)} onChange={() => toggleItem(canais, c, setCanais)} className="accent-ank-600" />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

              {/* Por cargo */}
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Por Cargo</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {CARGOS_OPCOES.map(({ value, label }) => (
                    <label key={value}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-xs transition-colors
                        ${papeis.includes(value) ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30 text-ank-700' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      <input type="checkbox" checked={papeis.includes(value)} onChange={() => toggleItem(papeis, value, setPapeis)} className="accent-ank-600" />
                      <span className="truncate">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Por loja */}
              {lojas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Por Loja</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lojas.filter(l => l.ativo).map(l => (
                      <label key={l.id}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 cursor-pointer text-xs transition-colors
                          ${selectedLojas.includes(l.id) ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30 text-ank-700' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                        <input type="checkbox" checked={selectedLojas.includes(l.id)} onChange={() => toggleItem(selectedLojas, l.id, setSelectedLojas)} className="accent-ank-600" />
                        {l.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
