import { useState, useEffect, useRef } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BellIcon, MoonIcon, SunIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'

interface AdminAlert {
  id: string
  tipo: 'licenca' | 'conformidade'
  titulo: string
  corpo: string
  urgente: boolean
  created_at: string
  lida: boolean
}

export default function AdminHeader({ pageTitle }: { pageTitle: string }) {
  const { toggleTheme, isDark } = useTheme()
  const [open, setOpen]         = useState(false)
  const [alerts, setAlerts]     = useState<AdminAlert[]>([])
  const [selected, setSelected] = useState<AdminAlert | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Carrega alertas automáticos do sistema
  useEffect(() => {
    loadAlerts()
  }, [])

  async function loadAlerts() {
    const now = new Date()

    // 1. Licenças expirando em <= 30 dias
    const { data: licenses } = await supabase
      .from('licenses')
      .select('id, tenant_id, status, data_fim_ciclo, tenant:tenants(nome_franquia)')
      .in('status', ['ACTIVE', 'ALERT', 'CRITICAL'])

    // 2. Franquias com conformidade comprometida
    const { data: compliance } = await supabase.rpc('check_tenant_compliance').then(
      r => r, () => ({ data: null })
    )

    const newAlerts: AdminAlert[] = []

    // Alertas de licença
    ;(licenses ?? []).forEach((licRaw: unknown) => {
      const lic = licRaw as { id: string; data_fim_ciclo: string; tenant?: { nome_franquia: string } | { nome_franquia: string }[] | null }
      const dias = differenceInDays(parseISO(lic.data_fim_ciclo), now)
      if (dias <= 30 && dias >= 0) {
        const tenantObj = Array.isArray(lic.tenant) ? lic.tenant[0] : lic.tenant
        const tenant = tenantObj?.nome_franquia ?? 'Franquia'
        newAlerts.push({
          id:         `lic-${lic.id}`,
          tipo:       'licenca',
          titulo:     dias <= 7 ? `⚠️ Licença crítica — ${tenant}` : `🔔 Licença expirando — ${tenant}`,
          corpo:      `A licença de ${tenant} vence em ${dias} dia${dias !== 1 ? 's' : ''} (${format(parseISO(lic.data_fim_ciclo), 'dd/MM/yyyy', { locale: ptBR })}). Entre em contato com o franqueado para renovação.`,
          urgente:    dias <= 7,
          created_at: new Date().toISOString(),
          lida:       false,
        })
      }
    })

    // Alertas de conformidade
    ;((compliance ?? []) as { tenant_id: string; tenant_name: string; days_since_upload: number | null; compliance_status: string }[])
      .filter(c => c.compliance_status === 'COMPROMETIDO')
      .forEach(c => {
        newAlerts.push({
          id:         `comp-${c.tenant_id}`,
          tipo:       'conformidade',
          titulo:     `📂 Sem upload — ${c.tenant_name}`,
          corpo:      `A franquia ${c.tenant_name} está há ${c.days_since_upload ?? '?'} dias sem enviar arquivos de vendas. Verifique com o responsável.`,
          urgente:    (c.days_since_upload ?? 0) > 14,
          created_at: new Date().toISOString(),
          lida:       false,
        })
      })

    // Ordena: urgentes primeiro
    newAlerts.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0))
    setAlerts(newAlerts)
  }

  function markRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, lida: true } : a))
  }

  function markAllRead() {
    setAlerts(prev => prev.map(a => ({ ...a, lida: true })))
  }

  function openAlert(a: AdminAlert) {
    setSelected(a)
    setOpen(false)
    markRead(a.id)
  }

  const unread = alerts.filter(a => !a.lida).length

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between
        border-b border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-900 px-6 transition-colors duration-200">

        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</h1>

        <div className="flex items-center gap-2">
          {/* Dark/Light */}
          <button onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="flex h-9 w-9 items-center justify-center rounded-full
              bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            {isDark
              ? <SunIcon className="h-5 w-5 text-amber-400" />
              : <MoonIcon className="h-5 w-5" />}
          </button>

          {/* Sino */}
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen(o => !o)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full
                bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <BellIcon className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center
                  rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* Painel dropdown */}
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl bg-white dark:bg-slate-900
                  shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">

                  {/* Header painel */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Alertas do Sistema</p>
                      <p className="text-xs text-slate-500">{unread > 0 ? `${unread} não lido${unread !== 1 ? 's' : ''}` : 'Tudo em dia'}</p>
                    </div>
                    {unread > 0 && (
                      <button onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors">
                        <CheckIcon className="h-3.5 w-3.5" />Marcar todas
                      </button>
                    )}
                  </div>

                  {/* Lista */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {alerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <span className="text-2xl mb-2">✅</span>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhum alerta</p>
                        <p className="text-xs text-slate-400">Todas as franquias estão em dia</p>
                      </div>
                    ) : alerts.map(a => (
                      <button key={a.id} onClick={() => openAlert(a)}
                        className={`w-full flex gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50
                          ${!a.lida ? (a.urgente ? 'bg-red-50/40 dark:bg-red-950/10' : 'bg-amber-50/30 dark:bg-amber-950/10') : ''}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm mt-0.5
                          ${a.tipo === 'licenca'
                            ? a.urgente ? 'bg-red-100 dark:bg-red-950/30' : 'bg-amber-100 dark:bg-amber-950/30'
                            : 'bg-blue-100 dark:bg-blue-950/30'}`}>
                          {a.tipo === 'licenca' ? (a.urgente ? '⚠️' : '🔔') : '📂'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${!a.lida ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                            {a.titulo}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{a.corpo}</p>
                        </div>
                        {!a.lida && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                      </button>
                    ))}
                  </div>

                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 text-center">
                      ANK Data — Alertas automáticos em tempo real
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Modal de detalhe do alerta */}
      {selected && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900
              shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">

              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{selected.tipo === 'licenca' ? (selected.urgente ? '⚠️' : '🔔') : '📂'}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider
                    ${selected.urgente ? 'text-red-600' : selected.tipo === 'licenca' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {selected.tipo === 'licenca' ? 'Alerta de Licença' : 'Alerta de Conformidade'}
                  </span>
                </div>
                <button onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 pb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">{selected.titulo}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selected.corpo}</p>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <button onClick={() => setSelected(null)}
                  className="rounded-xl px-5 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--admin-primary, #5086C6)' }}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
