import { ChartBarIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function EstoquePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="mb-4 text-5xl">📦</div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Gestão de Estoque</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        Alertas de ruptura iminente (cobertura ≤ 5 dias), estoque parado em curva A/B e monitoramento de lançamentos do ciclo Boticário.
      </p>
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-600 font-medium ring-1 ring-emerald-200">
        <ChartBarIcon className="h-4 w-4" />
        Disponível após o primeiro upload de dados
      </div>
      <Link to="/franqueado/upload" className="mt-4 text-sm text-ank-600 hover:text-ank-700 underline">
        Ir para Upload →
      </Link>
    </div>
  )
}
