import { useEffect, useState } from 'react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BellIcon, BoltIcon, MegaphoneIcon, Cog6ToothIcon,
  CheckIcon, MagnifyingGlassIcon, FunnelIcon,
  EnvelopeIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  NotificacoesService, type Notificacao, type NotifPreferencia,
  EVENTOS_PADRAO,
} from '../../services/notificacoes.service'
import Spinner from '../../components/ui/Spinner'

// ─── Config visual por tipo ───────────────────────────────────────────────────

const TIPO_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  sistema:  { icon: '⚡', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/30'   },
  anuncio:  { icon: '🚀', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  alerta:   { icon: '⚠️', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/30'  },
  info:     { icon: 'ℹ️', color: 'text-slate-600',  bg: 'bg-slate-100 dark:bg-slate-800'    },
}

type TabId = 'tudo' | 'sistema' | 'anuncios' | 'configuracao'
type SubFiltro = 'todas' | 'nao_lidas' | 'obrigatorias'

// ─── Página principal ─────────────────────────────────────────────────────────

export default function NotificacoesPage() {
  const { profile, user } = useAuth()
  const tenantId = profile?.tenant_id ?? ''
  const userId   = user?.id ?? ''

  const [notifs, setNotifs]           = useState<Notificacao[]>([])
  const [prefs, setPrefs]             = useState<Record<string, NotifPreferencia>>({})
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState<TabId>('tudo')
  const [sub, setSub]                 = useState<SubFiltro>('todas')
  const [search, setSearch]           = useState('')
  const [digestOn, setDigestOn]       = useState(true)
  const [selected, setSelected]       = useState<Notificacao | null>(null)

  async function fetchData() {
    if (!tenantId || !userId) return
    const [{ data: n }, { data: p }] = await Promise.all([
      NotificacoesService.list(tenantId, userId),
      NotificacoesService.getPreferencias(userId),
    ])
    setNotifs((n ?? []) as Notificacao[])
    const prefsMap: Record<string, NotifPreferencia> = {}
    ;(p ?? []).forEach((pref: NotifPreferencia) => { prefsMap[pref.evento] = pref })
    setPrefs(prefsMap)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [tenantId, userId])

  function marcarLida(id: string) {
    // Atualização otimista — estado local muda imediatamente, DB é background
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    NotificacoesService.marcarLida(id).then(({ error }) => {
      if (error) console.warn('[Notif] marcarLida DB error (non-blocking):', error.message)
    })
  }

  async function marcarTodasLidas() {
    // Otimista: zera tudo localmente primeiro
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
    try {
      await NotificacoesService.marcarTodasLidas(tenantId, userId)
      toast.success('Todas as notificações marcadas como lidas.')
    } catch {
      toast.error('Erro ao sincronizar com o servidor.')
    }
  }

  function openNotif(n: Notificacao) {
    setSelected({ ...n, lida: true }) // já abre o modal com estado "lido"
    if (!n.lida) marcarLida(n.id)
  }

  async function togglePref(evento: string, canal: 'sino' | 'email' | 'whatsapp') {
    const current = prefs[evento] ?? { evento, sino: true, email: false, whatsapp: false }
    const updated = { ...current, [canal]: !current[canal] }
    setPrefs(prev => ({ ...prev, [evento]: updated }))
    await NotificacoesService.upsertPreferencia(userId, evento, updated)
  }

  // Filtra por tab
  const tabFiltered = notifs.filter(n => {
    if (tab === 'sistema')  return n.tipo === 'sistema'
    if (tab === 'anuncios') return n.tipo === 'anuncio'
    return true
  })

  // Filtra por sub-filtro + busca
  const displayed = tabFiltered.filter(n => {
    if (sub === 'nao_lidas'   && n.lida)        return false
    if (sub === 'obrigatorias' && !n.obrigatoria) return false
    if (search && !n.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !(n.corpo ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const naoLidas = notifs.filter(n => !n.lida).length

  if (loading) return <Spinner fullScreen />

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'tudo',         label: 'Tudo',        icon: <BellIcon className="h-4 w-4" /> },
    { id: 'sistema',      label: 'Sistema',     icon: <BoltIcon className="h-4 w-4" /> },
    { id: 'anuncios',     label: 'Anúncios',    icon: <MegaphoneIcon className="h-4 w-4" /> },
    { id: 'configuracao', label: 'Configuração', icon: <Cog6ToothIcon className="h-4 w-4" /> },
  ]

  return (
    <div className={`mx-auto space-y-6 ${tab === 'configuracao' ? 'max-w-4xl' : 'max-w-3xl'}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40">
          <BellIcon className="h-6 w-6 text-ank-600 dark:text-ank-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notificações</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Central de notificações do sistema — toda movimentação chega aqui.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${tab === t.id
                ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      {tab === 'configuracao' ? (
        <ConfiguracaoTab
          digestOn={digestOn}
          onToggleDigest={setDigestOn}
          prefs={prefs}
          onTogglePref={togglePref}
        />
      ) : (
        <>
          {/* Sub-filtros + marcar lidas */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {naoLidas > 0 ? `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}` : 'Tudo em dia'}
            </p>
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400
                  hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <CheckIcon className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Busca + sub-filtro */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por título, conteúdo ou categoria…"
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800
                  pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400
                  focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200"
              />
            </div>
            <div className="flex gap-2">
              {([
                ['todas',        `Todas ${tabFiltered.length}`],
                ['nao_lidas',    `Não lidas ${tabFiltered.filter(n => !n.lida).length}`],
                ['obrigatorias', `Obrigatórias ${tabFiltered.filter(n => n.obrigatoria).length}`],
              ] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setSub(val)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors
                    ${sub === val
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de notificações */}
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center
              rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <FunnelIcon className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-medium text-slate-600 dark:text-slate-400">
                {search ? 'Nenhuma notificação encontrada' : 'Sem notificações ainda'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map(n => {
                const cfg = TIPO_ICON[n.tipo] ?? TIPO_ICON.info
                return (
                  <div key={n.id}
                    className={`rounded-2xl border transition-all cursor-pointer hover:shadow-sm
                      ${!n.lida
                        ? 'bg-white dark:bg-slate-900 border-ank-200 dark:border-ank-800 border-l-4'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}
                    onClick={() => openNotif(n)}
                  >
                    <div className="flex gap-3.5 px-5 py-4">
                      {/* Ícone */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base mt-0.5 ${cfg.bg}`}>
                        {cfg.icon}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        {n.categoria && (
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${cfg.color}`}>
                            {n.categoria}
                          </p>
                        )}
                        <p className={`text-sm leading-snug ${!n.lida ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                          {n.titulo}
                        </p>
                        {n.corpo && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.corpo}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                          {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ptBR })}
                          {' · '}
                          {format(parseISO(n.created_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR })}
                        </p>
                      </div>

                      {/* Indicador não lido */}
                      {!n.lida && (
                        <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-ank-500" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {/* Modal de detalhe da notificação */}
      {selected && (
        <NotifDetailModal
          notif={selected}
          onClose={() => setSelected(null)}
          onDispense={() => { marcarLida(selected.id); setSelected(null) }}
        />
      )}
    </div>
  )
}

// ─── Modal de detalhe da notificação ─────────────────────────────────────────

function NotifDetailModal({ notif, onClose, onDispense }: {
  notif: Notificacao
  onClose: () => void
  onDispense: () => void
}) {
  const cfg = TIPO_ICON[notif.tipo] ?? TIPO_ICON.info

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Painel centralizado */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900
          shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${cfg.bg}`}>
                {cfg.icon}
              </div>
              <div>
                {notif.categoria && (
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                    {notif.categoria}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {format(parseISO(notif.created_at), "dd/MM/yyyy, HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800
                hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Título */}
          <div className="px-6 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {notif.titulo}
            </h2>
          </div>

          {/* Corpo */}
          {notif.corpo && (
            <div className="px-6 pb-5">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {notif.corpo}
              </p>
            </div>
          )}

          {/* Linha de ação — opcional */}
          {notif.obrigatoria && (
            <div className="px-6 pb-4">
              <button className="w-full rounded-xl border-2 border-ank-200 dark:border-ank-700 py-2.5
                text-sm font-medium text-ank-600 dark:text-ank-400
                hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
                Ir para ação
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            {!notif.lida && (
              <button onClick={onDispense}
                className="text-sm font-medium text-slate-500 dark:text-slate-400
                  hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-3 py-1.5">
                Dispensar
              </button>
            )}
            <button onClick={onClose}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--fp-primary, #5086C6)' }}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Aba de Configuração ──────────────────────────────────────────────────────

function ConfiguracaoTab({ digestOn, onToggleDigest, prefs, onTogglePref }: {
  digestOn: boolean
  onToggleDigest: (v: boolean) => void
  prefs: Record<string, NotifPreferencia>
  onTogglePref: (evento: string, canal: 'sino' | 'email' | 'whatsapp') => void
}) {
  return (
    <div className="space-y-5">
      {/* Email diário */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Email diário (digest)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Receber resumo diário às 07h — manda um email único com tudo que rolou nas últimas 24h.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                  🕐 07:05 BRT diário
                </span>
              </div>
            </div>
          </div>
          <Toggle checked={digestOn} onChange={onToggleDigest} />
        </div>
      </div>

      {/* Preferências por evento */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Preferências de notificação</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Liga ou desliga cada categoria por canal. Suas escolhas são individuais.
          </p>
        </div>

        {/* Header da tabela */}
        <div className="grid grid-cols-[1fr_110px_110px_120px] gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-800
          text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <span>Categoria</span>
          <span className="text-center">🔔&nbsp;Sino</span>
          <span className="text-center">📧&nbsp;Email</span>
          <span className="text-center">💬&nbsp;WhatsApp</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {EVENTOS_PADRAO.map(ev => {
            const pref = prefs[ev.evento] ?? { sino: true, email: false, whatsapp: false }
            return (
              <div key={ev.evento} className="grid grid-cols-[1fr_110px_110px_120px] gap-2 px-5 py-3.5 items-center
                hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ev.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{ev.descricao}</p>
                </div>
                <div className="flex justify-center">
                  <Toggle checked={pref.sino} onChange={() => onTogglePref(ev.evento, 'sino')} size="sm" />
                </div>
                <div className="flex justify-center">
                  <Toggle checked={pref.email} onChange={() => onTogglePref(ev.evento, 'email')} size="sm" />
                </div>
                <div className="flex justify-center">
                  <Toggle checked={pref.whatsapp} onChange={() => onTogglePref(ev.evento, 'whatsapp')} size="sm" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Toggle reutilizável ──────────────────────────────────────────────────────

function Toggle({ checked, onChange, size = 'md' }: {
  checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md'
}) {
  const w = size === 'sm' ? 'w-9' : 'w-11'
  const h = size === 'sm' ? 'h-5' : 'h-6'
  const dot = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const on  = size === 'sm' ? 'translate-x-4' : 'translate-x-6'

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${h} ${w} items-center rounded-full transition-colors
        ${checked ? 'bg-ank-600' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span className={`inline-block ${dot} transform rounded-full bg-white shadow-sm transition-transform
        ${checked ? on : 'translate-x-1'}`} />
    </button>
  )
}
