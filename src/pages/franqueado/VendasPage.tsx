import { ChartBarIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function VendasPage() {
  return <ModulePlaceholder emoji="📊" title="Análise de Vendas" slug="vendas"
    description="Visualize Sell-Out, giro de estoque, performance por vendedor e alertas de ruptura gerados por IA após o upload do arquivo de vendas." />
}

function ModulePlaceholder({ emoji, title, description, slug }: {
  emoji: string; title: string; description: string; slug: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="mb-4 text-5xl">{emoji}</div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      <div className="inline-flex items-center gap-2 rounded-full bg-ank-50 px-4 py-2 text-sm text-ank-600 font-medium ring-1 ring-ank-200">
        <ChartBarIcon className="h-4 w-4" />
        Disponível após o primeiro upload de dados
      </div>
      <Link to="/franqueado/upload" className="mt-4 text-sm text-ank-600 hover:text-ank-700 underline">
        Ir para Upload →
      </Link>
    </div>
  )
}
