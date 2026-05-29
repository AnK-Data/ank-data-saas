import { useState } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useLicense } from '../../hooks/useLicense'

/**
 * Spec 08 — BANNER_TOPO
 * Exibido quando faltam entre 8 e 30 dias para o fim do ciclo contratual.
 * Dispensável por sessão.
 */
export default function LicenseAlertBanner() {
  const { license } = useLicense()
  const [dismissed, setDismissed] = useState(false)

  if (!license || dismissed) return null

  const dias = differenceInDays(parseISO(license.data_fim_ciclo), new Date())

  // Banner apenas entre 8 e 30 dias restantes
  if (dias < 8 || dias > 30) return null

  const vencimento = format(parseISO(license.data_fim_ciclo), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const isWarning = dias <= 15

  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3 text-sm
      ${isWarning
        ? 'bg-orange-500 text-white'
        : 'bg-amber-400 text-amber-900'
      }`}>
      <div className="flex items-center gap-2.5">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
        <span>
          <strong>Atenção:</strong> Sua licença vence em <strong>{dias} dias</strong> ({vencimento}).
          {' '}Entre em contato com a ANK Data para renovação:{' '}
          <a href="mailto:suporte@ankdata.com.br" className="underline font-semibold">
            suporte@ankdata.com.br
          </a>
        </span>
      </div>
      <button onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 hover:bg-black/10 transition-colors">
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
