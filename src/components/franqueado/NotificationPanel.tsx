import { useEffect, useRef } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { Notificacao } from '../../services/notificacoes.service'

const TIPO_ICON: Record<string, string> = {
  sistema:  '⚡',
  anuncio:  '🚀',
  alerta:   '⚠️',
  info:     'ℹ️',
}

interface Props {
  open: boolean
  onClose: () => void
  /** Apenas notificações NÃO LIDAS — ao marcar como lida sai desta lista */
  notifications: Notificacao[]
  onMarkAllRead: () => void
  onNotifClick: (n: Notificacao) => void
}

export default function NotificationPanel({
  open, onClose, notifications, onMarkAllRead, onNotifClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Overlay semitransparente */}
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={onClose} />

      {/* Painel deslizante */}
      <div
        ref={ref}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col
          bg-white dark:bg-slate-900 shadow-2xl
          border-l border-slate-200 dark:border-slate-700"
      >
        {/* Header do painel */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Notificações</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {notifications.length > 0
                ? `${notifications.length} não lida${notifications.length !== 1 ? 's' : ''}`
                : 'Tudo em dia'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400
                  hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded-lg
                  hover:bg-slate-100 dark:hover:bg-slate-800"
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
              <button
                key={n.id}
                onClick={() => onNotifClick(n)}
                className="w-full flex gap-3.5 px-5 py-4 text-left
                  bg-blue-50/40 dark:bg-ank-950/20
                  hover:bg-blue-50 dark:hover:bg-ank-950/30
                  transition-colors cursor-pointer"
              >
                {/* Ícone */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                  bg-white dark:bg-slate-800 shadow-sm text-lg mt-0.5">
                  {TIPO_ICON[n.tipo] ?? 'ℹ️'}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {n.titulo}
                  </p>
                  {n.corpo && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.corpo}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      AnK Data
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>

                {/* Bolinha não lida */}
                <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-ank-500 self-start" />
              </button>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-3">
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-slate-400 dark:text-slate-500
              hover:text-ank-600 dark:hover:text-ank-400 transition-colors"
          >
            AnK Data — Central de Notificações
          </button>
        </div>
      </div>
    </>
  )
}
