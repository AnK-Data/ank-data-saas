import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon, MoonIcon, SunIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { NotificacoesService, type Notificacao } from '../../services/notificacoes.service'
import NotificationPanel from './NotificationPanel'

const TIPO_ICON: Record<string, string> = {
  sistema:  '⚡',
  anuncio:  '🚀',
  alerta:   '⚠️',
  info:     'ℹ️',
}

export default function FranchiseHeader({ pageTitle }: { pageTitle: string }) {
  const { toggleTheme, isDark } = useTheme()
  const { profile, user }       = useAuth()
  const navigate                = useNavigate()

  const [notifOpen, setNotifOpen]       = useState(false)
  const [notifications, setNotifications] = useState<Notificacao[]>([])
  const [selected, setSelected]         = useState<Notificacao | null>(null)

  const tenantId = profile?.tenant_id ?? ''
  const userId   = user?.id ?? ''

  // Carrega notificações reais do Supabase
  useEffect(() => {
    if (!tenantId || !userId) return
    NotificacoesService.list(tenantId, userId).then(({ data }) => {
      setNotifications((data ?? []) as Notificacao[])
    })
  }, [tenantId, userId])

  // Só mostra não lidas no sino
  const unread = notifications.filter(n => !n.lida)
  const unreadCount = unread.length

  function markAsRead(id: string) {
    // Otimista: remove da lista de não-lidas imediatamente
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    NotificacoesService.marcarLida(id).then(({ error }) => {
      if (error) console.warn('[Header] marcarLida error:', error.message)
    })
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
    NotificacoesService.marcarTodasLidas(tenantId, userId).then(({ error }) => {
      if (error) console.warn('[Header] marcarTodasLidas error:', error.message)
    })
  }

  function openNotif(n: Notificacao) {
    setSelected(n)
    setNotifOpen(false)  // fecha o painel ao abrir o detalhe
    if (!n.lida) markAsRead(n.id)
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between
        border-b border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-900 px-6 transition-colors duration-200">

        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</h1>

        <div className="flex items-center gap-2">
          {/* Dark/Light toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="flex h-9 w-9 items-center justify-center rounded-full
              bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isDark
              ? <MoonIcon className="h-5 w-5 text-amber-400" />
              : <MoonIcon className="h-5 w-5" />
            }
          </button>

          {/* Sino */}
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full
              bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Notificações"
          >
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center
                rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Painel de notificações */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={unread}          // só não lidas no painel
        onMarkAllRead={markAllRead}
        onNotifClick={openNotif}
      />

      {/* Modal de detalhe ao clicar */}
      {selected && (
        <NotifDetailModal
          notif={selected}
          onClose={() => setSelected(null)}
          onNavigate={() => { setSelected(null); navigate('/franqueado/notificacoes') }}
        />
      )}
    </>
  )
}

// ─── Modal de detalhe (inline no header) ─────────────────────────────────────

function NotifDetailModal({ notif, onClose, onNavigate }: {
  notif: Notificacao
  onClose: () => void
  onNavigate: () => void
}) {
  const icon = TIPO_ICON[notif.tipo] ?? 'ℹ️'

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900
          shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{icon}</span>
              <div>
                {notif.categoria && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ank-600 dark:text-ank-400">
                    {notif.categoria}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true, locale: ptBR })}
                  {' · '}
                  {format(parseISO(notif.created_at), "dd/MM/yyyy, HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4
            border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <button onClick={onNavigate}
              className="text-sm font-medium text-ank-600 dark:text-ank-400 hover:underline transition-colors">
              Ver todas as notificações →
            </button>
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
