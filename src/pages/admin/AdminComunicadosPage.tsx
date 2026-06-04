import { useEffect, useState, useRef, type FormEvent, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MegaphoneIcon, PlusIcon, PaperClipIcon, LinkIcon,
  TrashIcon, EyeIcon, CheckCircleIcon, XMarkIcon,
  InformationCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { PAPEL_LABELS, FRANQUEADO_ROLES } from '../../types'
import type { FranqueadoRole } from '../../types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoCom = 'informativo' | 'aviso' | 'urgente'

interface Anexo { nome: string; url: string; tipo: string; tamanho: number }
interface LinkItem { titulo: string; url: string }

interface AdminComunicado {
  id: string
  titulo: string
  mensagem: string
  tipo: TipoCom
  destinatarios: Record<string, unknown> | null
  anexos: Anexo[]
  links: LinkItem[]
  publicado: boolean
  created_at: string
  leituras?: number
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────

const TIPO_CFG: Record<TipoCom, { label: string; icon: typeof InformationCircleIcon; badge: string }> = {
  informativo: { label: 'Informativo', icon: InformationCircleIcon, badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-700' },
  aviso:       { label: 'Aviso',       icon: ExclamationTriangleIcon, badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-700' },
  urgente:     { label: 'Urgente',     icon: ExclamationTriangleIcon, badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-red-200 dark:ring-red-700' },
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminComunicadosPage() {
  const { user } = useAuth()
  const [comunicados, setComunicados] = useState<AdminComunicado[]>([])
  const [loading, setLoading]         = useState(true)
  const [novoOpen, setNovoOpen]       = useState(false)
  const [viewing, setViewing]         = useState<AdminComunicado | null>(null)

  async function fetchComunicados() {
    const { data } = await supabase
      .from('admin_comunicados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setComunicados((data ?? []) as AdminComunicado[])
    setLoading(false)
  }

  useEffect(() => { fetchComunicados() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Excluir este comunicado?')) return
    const { error } = await supabase.from('admin_comunicados').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir.'); return }
    toast.success('Comunicado excluído.')
    setComunicados(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
          <MegaphoneIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Comunicados</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Envie mensagens, arquivos e links para todos os clientes ou grupos específicos.
          </p>
        </div>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setNovoOpen(true)}>
          Novo Comunicado
        </Button>
      </div>

      {/* Lista */}
      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60">
          <CardHeader
            title="Comunicados enviados"
            subtitle={`${comunicados.length} comunicado${comunicados.length !== 1 ? 's' : ''} · ${comunicados.filter(c => c.publicado).length} publicado${comunicados.filter(c => c.publicado).length !== 1 ? 's' : ''}`}
          />
        </div>

        {comunicados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MegaphoneIcon className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum comunicado enviado ainda</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Clique em "+ Novo Comunicado" para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {comunicados.map(com => {
              const cfg = TIPO_CFG[com.tipo]
              const Icon = cfg.icon
              return (
                <div key={com.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${cfg.badge}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{com.titulo}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {!com.publicado && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold
                          bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600">
                          Rascunho
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{com.mensagem}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      <span>{format(parseISO(com.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      {com.anexos?.length > 0 && <span>📎 {com.anexos.length} anexo{com.anexos.length > 1 ? 's' : ''}</span>}
                      {com.links?.length > 0 && <span>🔗 {com.links.length} link{com.links.length > 1 ? 's' : ''}</span>}
                      {com.destinatarios === null ? <span>👥 Todos os clientes</span> : <span>🎯 Segmentado</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setViewing(com)} title="Visualizar"
                      className="rounded-lg p-2 text-slate-400 hover:text-ank-600 hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(com.id)} title="Excluir"
                      className="rounded-lg p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Modais */}
      <NovoComunicadoModal
        open={novoOpen}
        autorId={user?.id ?? ''}
        onClose={() => setNovoOpen(false)}
        onSaved={() => { setNovoOpen(false); fetchComunicados() }}
      />

      {viewing && (
        <VisualizarModal comunicado={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

// ─── Modal: Novo Comunicado ───────────────────────────────────────────────────

function NovoComunicadoModal({ open, autorId, onClose, onSaved }: {
  open: boolean; autorId: string; onClose: () => void; onSaved: () => void
}) {
  const [titulo, setTitulo]           = useState('')
  const [mensagem, setMensagem]       = useState('')
  const [tipo, setTipo]               = useState<TipoCom>('informativo')
  const [destMode, setDestMode]       = useState<'todos' | 'perfis'>('todos')
  const [perfisSelected, setPerfisSelected] = useState<FranqueadoRole[]>([])
  const [anexos, setAnexos]           = useState<Anexo[]>([])
  const [links, setLinks]             = useState<LinkItem[]>([])
  const [linkTitulo, setLinkTitulo]   = useState('')
  const [linkUrl, setLinkUrl]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Grupos de perfis para exibição no seletor
  const PERFIL_GRUPOS: { label: string; roles: FranqueadoRole[] }[] = [
    {
      label: 'Gestão',
      roles: ['franqueado', 'sucessor', 'funcionario_administrativo_cp', 'funcionario_financeiro_cp'],
    },
    {
      label: 'Loja / Varejo',
      roles: ['gerente_canal_loja', 'supervisor_loja', 'gerente_loja', 'multiplicador_treinamento_loja', 'consultor_loja'],
    },
    {
      label: 'Venda Direta',
      roles: ['gerente_canal_vd', 'gerente_operacoes_vd', 'gerente_er', 'supervisor_campo', 'multiplicador_treinamento_vd', 'atendente_vd'],
    },
    {
      label: 'Logística',
      roles: ['gerente_logistica', 'lider_logistica', 'assistente_logistica', 'estoquista', 'auxiliar_logistica'],
    },
  ]

  const togglePerfil = useCallback((role: FranqueadoRole) => {
    setPerfisSelected(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }, [])

  const toggleGrupo = useCallback((roles: FranqueadoRole[], todos: boolean) => {
    if (todos) setPerfisSelected(prev => [...new Set([...prev, ...roles])])
    else setPerfisSelected(prev => prev.filter(r => !roles.includes(r)))
  }, [])

  useEffect(() => {
    if (open) {
      setTitulo(''); setMensagem(''); setTipo('informativo')
      setDestMode('todos'); setPerfisSelected([])
      setAnexos([]); setLinks([])
    }
  }, [open])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      // Sanitiza o nome: remove acentos e caracteres especiais
      const ext      = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
      const baseName = file.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove acentos
        .replace(/\.[^.]+$/, '')                             // remove extensão
        .replace(/[^a-zA-Z0-9]/g, '_')                      // substitui tudo que não for alfanum
        .replace(/_+/g, '_').replace(/^_|_$/g, '')           // limpa underscores duplos/extremos
      const safeName = `${baseName}.${ext}`
      const path = `comunicados/${Date.now()}_${safeName}`

      const { data, error } = await supabase.storage
        .from('admin-assets')
        .upload(path, file, { upsert: false, contentType: file.type })

      if (error) {
        console.error('[Storage] upload error:', error)
        toast.error(`Erro ao enviar "${file.name}": ${error.message}`)
        continue
      }
      // Armazena o PATH (não a URL pública) — URL assinada é gerada no momento do acesso
      setAnexos(prev => [...prev, { nome: file.name, url: data.path, tipo: file.type, tamanho: file.size }])
      toast.success(`${file.name} enviado!`)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function addLink() {
    if (!linkUrl.trim()) return
    setLinks(prev => [...prev, { titulo: linkTitulo.trim() || linkUrl, url: linkUrl.trim() }])
    setLinkTitulo(''); setLinkUrl('')
  }

  async function handleSubmit(e: FormEvent, publicar: boolean) {
    e.preventDefault()
    if (!titulo.trim() || !mensagem.trim()) { toast.error('Título e mensagem são obrigatórios.'); return }
    if (publicar && destMode === 'perfis' && perfisSelected.length === 0) {
      toast.error('Selecione pelo menos um perfil de destinatário.'); return
    }
    setSaving(true)
    try {
      const destinatarios = destMode === 'todos'
        ? null
        : { papeis: perfisSelected }

      // Inclui link pendente (se usuário digitou mas não clicou no +)
      const linksFinais = linkUrl.trim()
        ? [...links, { titulo: linkTitulo.trim() || linkUrl.trim(), url: linkUrl.trim() }]
        : links

      const { error } = await supabase.from('admin_comunicados').insert({
        titulo:        titulo.trim(),
        mensagem:      mensagem.trim(),
        tipo,
        autor_id:      autorId,
        destinatarios,
        anexos,
        links:         linksFinais,
        publicado:     publicar,
      })
      if (error) throw error
      toast.success(publicar ? 'Comunicado publicado para todos os clientes!' : 'Rascunho salvo.')
      onSaved()
    } catch { toast.error('Erro ao salvar comunicado.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Novo Comunicado"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <button
            onClick={e => handleSubmit(e as unknown as FormEvent, false)}
            disabled={saving}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40">
            Salvar rascunho
          </button>
          <Button onClick={e => handleSubmit(e as unknown as React.MouseEvent, true)} loading={saving}
            leftIcon={<CheckCircleIcon className="h-4 w-4" />}>
            Publicar para clientes
          </Button>
        </div>
      }
    >
      <form className="space-y-5">
        {/* Título */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Título *</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} required
            placeholder="Ex: Atualização importante da plataforma"
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200 dark:focus:ring-ank-900"
          />
        </div>

        {/* Mensagem */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mensagem *</label>
          <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} required rows={5}
            placeholder="Escreva o conteúdo do comunicado..."
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-2 text-sm resize-none focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200 dark:focus:ring-ank-900"
          />
        </div>

        {/* Tipo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
          <div className="flex gap-2">
            {(Object.entries(TIPO_CFG) as [TipoCom, typeof TIPO_CFG[TipoCom]][]).map(([key, cfg]) => {
              const Icon = cfg.icon
              return (
                <button key={key} type="button" onClick={() => setTipo(key)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors
                    ${tipo === key ? cfg.badge : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700'}`}>
                  <Icon className="h-3.5 w-3.5" />{cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Destinatários */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Destinatários</label>

          {/* Modo */}
          <div className="flex gap-2">
            {[
              { value: 'todos',  label: '👥 Todos os clientes' },
              { value: 'perfis', label: '🎯 Por perfil de acesso' },
            ].map(opt => (
              <label key={opt.value}
                className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 cursor-pointer transition-colors flex-1 text-sm
                  ${destMode === opt.value
                    ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30 text-ank-700 dark:text-ank-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                <input type="radio" name="dest" value={opt.value}
                  checked={destMode === opt.value}
                  onChange={() => setDestMode(opt.value as 'todos' | 'perfis')}
                  className="accent-ank-600" />
                {opt.label}
              </label>
            ))}
          </div>

          {destMode === 'todos' && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              O comunicado será visível para todos os franqueados e colaboradores.
            </p>
          )}

          {/* Seletor de perfis */}
          {destMode === 'perfis' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Resumo selecionados */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {perfisSelected.length === 0
                    ? 'Nenhum perfil selecionado'
                    : `${perfisSelected.length} perfil${perfisSelected.length > 1 ? 'is' : ''} selecionado${perfisSelected.length > 1 ? 's' : ''}`}
                </span>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setPerfisSelected(FRANQUEADO_ROLES as FranqueadoRole[])}
                    className="text-[11px] text-ank-600 dark:text-ank-400 hover:underline">Todos</button>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <button type="button"
                    onClick={() => setPerfisSelected([])}
                    className="text-[11px] text-slate-400 hover:underline">Limpar</button>
                </div>
              </div>

              {/* Grupos de perfis */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-64 overflow-y-auto">
                {PERFIL_GRUPOS.map(grupo => {
                  const todosNoGrupo = grupo.roles.every(r => perfisSelected.includes(r))
                  return (
                    <div key={grupo.label} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          {grupo.label}
                        </p>
                        <button type="button"
                          onClick={() => toggleGrupo(grupo.roles, !todosNoGrupo)}
                          className="text-[11px] text-ank-600 dark:text-ank-400 hover:underline">
                          {todosNoGrupo ? 'Desmarcar todos' : 'Selecionar todos'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {grupo.roles.map(role => (
                          <label key={role}
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer text-xs transition-colors
                              ${perfisSelected.includes(role)
                                ? 'bg-ank-50 dark:bg-ank-950/30 text-ank-700 dark:text-ank-400 ring-1 ring-ank-300 dark:ring-ank-700'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            <input type="checkbox" checked={perfisSelected.includes(role)}
                              onChange={() => togglePerfil(role)} className="accent-ank-600 h-3.5 w-3.5" />
                            <span className="truncate">{PAPEL_LABELS[role]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {destMode === 'perfis' && perfisSelected.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Selecione pelo menos um perfil para publicar.
            </p>
          )}
        </div>

        {/* Anexos */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Anexos e Imagens</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm
                text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40">
              <PaperClipIcon className="h-4 w-4" />
              {uploading ? 'Enviando…' : 'Adicionar arquivo / imagem'}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.ppt,.pptx,.zip"
              className="hidden" onChange={handleFileUpload} />
            <span className="text-xs text-slate-400 dark:text-slate-500">Imagens, PDF, Excel, Word, PPT</span>
          </div>
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {anexos.map((a, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800
                  border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[160px]">{a.nome}</span>
                  <button type="button" onClick={() => setAnexos(prev => prev.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-red-500">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Links
            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
              (pressione Enter ou clique em + para adicionar)
            </span>
          </label>
          <div className="flex gap-2">
            <input value={linkTitulo} onChange={e => setLinkTitulo(e.target.value)}
              placeholder="Título (ex: Acesse aqui)"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                px-3 py-2 text-sm focus:border-ank-400 focus:outline-none"
            />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
              placeholder="https://exemplo.com.br"
              className="flex-[2] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                px-3 py-2 text-sm focus:border-ank-400 focus:outline-none"
            />
            <button type="button" onClick={addLink}
              title="Adicionar link"
              className="rounded-lg bg-ank-600 hover:bg-ank-700 px-4 py-2 text-sm font-bold text-white
                transition-colors shrink-0">
              +
            </button>
          </div>
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30
                  border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400">
                  <LinkIcon className="h-3 w-3" />
                  <span className="truncate max-w-[180px]">{l.titulo}</span>
                  <button type="button" onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}
                    className="text-blue-400 hover:text-red-500">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

// ─── Abre anexo via signed URL — nunca expõe token ao usuário ────────────────

async function abrirAnexo(urlOrPath: string) {
  // Extrai o path do storage independente do formato armazenado:
  // 1. URL pública antiga: .../object/public/admin-assets/comunicados/xxx.pdf  → comunicados/xxx.pdf
  // 2. URL signed antiga:  .../object/sign/admin-assets/comunicados/xxx.pdf   → comunicados/xxx.pdf
  // 3. Path direto (novo): comunicados/xxx.pdf → usa diretamente
  let storagePath = urlOrPath

  const publicMarker = '/object/public/admin-assets/'
  const signMarker   = '/object/sign/admin-assets/'

  if (urlOrPath.includes(publicMarker)) {
    storagePath = urlOrPath.split(publicMarker)[1].split('?')[0]
  } else if (urlOrPath.includes(signMarker)) {
    storagePath = urlOrPath.split(signMarker)[1].split('?')[0]
  } else if (urlOrPath.startsWith('http') && !urlOrPath.includes('supabase.co')) {
    // URL externa (não do Supabase) — abrir direto
    window.open(urlOrPath, '_blank')
    return
  }

  // Gera signed URL com expiração de 1h — o token não aparece na barra do browser
  // pois o arquivo é servido diretamente como download pelo Supabase
  const EXPIRY_48H = 48 * 60 * 60  // 172800 segundos

  const { data, error } = await supabase.storage
    .from('admin-assets')
    .createSignedUrl(storagePath, EXPIRY_48H)

  if (error || !data?.signedUrl) {
    if (error?.message?.includes('expired') || error?.message?.includes('not found')) {
      toast.error('Este anexo não está mais disponível. Contate a AnK Data.')
    } else {
      toast.error('Não foi possível abrir o anexo. Tente novamente em instantes.')
    }
    return
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

// ─── Modal: Visualizar ────────────────────────────────────────────────────────

function VisualizarModal({ comunicado, onClose }: { comunicado: AdminComunicado; onClose: () => void }) {
  const cfg = TIPO_CFG[comunicado.tipo]
  const Icon = cfg.icon
  return (
    <Modal open title={comunicado.titulo} onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
            <Icon className="h-3.5 w-3.5" />{cfg.label}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {format(parseISO(comunicado.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
          {!comunicado.publicado && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Rascunho</span>}
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {comunicado.mensagem}
        </p>

        {comunicado.anexos?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Anexos</p>
            <div className="flex flex-wrap gap-2">
              {comunicado.anexos.map((a, i) => (
                <button key={i} onClick={() => abrirAnexo(a.url)} type="button"
                  className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800
                    border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-ank-600 dark:text-ank-400
                    hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
                  <PaperClipIcon className="h-3.5 w-3.5" />{a.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {comunicado.links?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Links</p>
            <div className="flex flex-col gap-1.5">
              {comunicado.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-ank-600 dark:text-ank-400 hover:underline">
                  <LinkIcon className="h-4 w-4 shrink-0" />{l.titulo}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
