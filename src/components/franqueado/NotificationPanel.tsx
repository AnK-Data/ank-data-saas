import { useEffect, useRef } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface Notification {
  id: string
  titulo: string
  corpo: string
  tipo: 'info' | 'warning' | 'success' | 'update'
  lida: boolean
  created_at: string
  fonte?: string
}

const TIPO_ICON: Record<string, string> = {
  update:  '🚀',
  info:    'ℹ️',
  warning: '⚠️',
  success: '✅',
}

interface Props {
  open: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkAllRead: () => void
}

export default function NotificationPanel({ open, onClose, notifications, onMarkAllRead }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const unread = notifications.filter(n => !n.lida).length

  if (!open) return null

  return (
    <>
      {/* Overlay semitransparente */}
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={onClose} />

      {/* Painel */}
      <div
        ref={ref}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col
          bg-white dark:bg-slate-900 shadow-2xl
          border-l border-slate-200 dark:border-slate-700
          animate-in slide-in-from-right duration-200"
      >
        {/* Header do painel */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Notificações</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unread > 0 ? `${unread} não lida${unread !== 1 ? 's' : ''}` : 'Todas lidas'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400
                  hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800
                hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <span className="text-3xl mb-3">🔔</span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhuma notificação</p>
              <p className="text-xs text-slate-400 mt-1">Você está em dia com tudo!</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`flex gap-3.5 px-5 py-4 cursor-pointer transition-colors
                  hover:bg-slate-50 dark:hover:bg-slate-800/50
                  ${!n.lida ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
              >
                {/* Ícone */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                  bg-slate-100 dark:bg-slate-800 text-lg mt-0.5">
                  {TIPO_ICON[n.tipo] ?? 'ℹ️'}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.lida ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                    {n.titulo}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {n.corpo}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {n.fonte && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{n.fonte}</span>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      · {format(parseISO(n.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                {/* Indicador não lido */}
                {!n.lida && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full franchise-btn-primary" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-3">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            ANK Data — Central de Notificações
          </p>
        </div>
      </div>
    </>
  )
}
