import { ChartBarIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function FinanceiroPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="mb-4 text-5xl">💰</div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Controle Financeiro</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        Análise de margem, erosão por desconto manual e custo de antecipação de recebíveis. Saúde financeira: 🟢 Verde / 🟡 Amarelo / 🔴 Vermelho.
      </p>
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-600 font-medium ring-1 ring-amber-200">
        <ChartBarIcon className="h-4 w-4" />
        Disponível após o primeiro upload de dados
      </div>
      <Link to="/franqueado/upload" className="mt-4 text-sm text-ank-600 hover:text-ank-700 underline">
        Ir para Upload →
      </Link>
    </div>
  )
}
