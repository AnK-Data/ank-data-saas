import { useEffect, useState } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { useLicense } from '../../hooks/useLicense'
import Button from '../ui/Button'

const SESSION_KEY = 'ank_license_modal_shown'

/**
 * Spec 08 — MODAL_POPUP
 * Exibido uma vez por sessão quando faltam menos de 7 dias para o vencimento.
 * Imperativo — bloqueia a interação enquanto aberto.
 */
export default function LicenseAlertModal() {
  const { license } = useLicense()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!license) return
    const dias = differenceInDays(parseISO(license.data_fim_ciclo), new Date())

    // Mostra apenas uma vez por sessão quando < 7 dias
    if (dias >= 0 && dias < 7 && !sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }
  }, [license])

  if (!open || !license) return null

  const dias     = differenceInDays(parseISO(license.data_fim_ciclo), new Date())
  const vencimento = format(parseISO(license.data_fim_ciclo), "dd/MM/yyyy", { locale: ptBR })
  const isToday  = dias === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header vermelho */}
        <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
          <ExclamationCircleIcon className="h-8 w-8 text-white shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-white">Licença Crítica</h2>
            <p className="text-sm text-red-200">
              {isToday ? 'Sua licença vence hoje!' : `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-700 mb-4">
            Sua licença da plataforma AnK Data{' '}
            {isToday
              ? <strong className="text-red-600">vence hoje ({vencimento})</strong>
              : <>vence em <strong className="text-red-600">{dias} dias ({vencimento})</strong></>
            }.
            {' '}Após o vencimento, o acesso ao sistema será bloqueado automaticamente.
          </p>

          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-5">
            <p className="font-semibold mb-1">Para renovar sua licença:</p>
            <p>📧 suporte@ankdata.com.br</p>
          </div>

          <Button onClick={() => setOpen(false)} className="w-full">
            Entendido — Continuar
          </Button>
        </div>
      </div>
    </div>
  )
}
