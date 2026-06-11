import { useState, useEffect } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  ChartBarSquareIcon, UsersIcon, StarIcon,
  BuildingOffice2Icon, ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { useVDQuery } from './hooks/useVDQuery'
import VDFilters from './components/VDFilters'
import OverviewTab      from './tabs/OverviewTab'
import RevendedorasTab  from './tabs/RevendedorasTab'
import SupervisoresTab  from './tabs/SupervisoresTab'
import EstruturasTab    from './tabs/EstruturasTab'
import ProdutosTab      from './tabs/ProdutosTab'
import type { VDFilters as VDFiltersType } from '../../../types'

type TabId = 'overview' | 'revendedoras' | 'supervisores' | 'estruturas' | 'produtos'

type CicloItem = { ciclo: string; receita_bruta: number; receita_liquida: number; volume: number }

const TABS: { id: TabId; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'overview',     label: 'Visao Geral',  icon: ChartBarSquareIcon },
  { id: 'revendedoras', label: 'Revendedoras', icon: UsersIcon           },
  { id: 'supervisores', label: 'Supervisores', icon: StarIcon            },
  { id: 'estruturas',   label: 'Estruturas',   icon: BuildingOffice2Icon },
  { id: 'produtos',     label: 'Produtos',     icon: ShoppingBagIcon     },
]

export default function VendaDiretaPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [filters, setFilters]     = useState<VDFiltersType>({})
  const [revPage, setRevPage]     = useState(0)

  const ciclosList = useVDQuery<{ ciclos: CicloItem[] }>({ queryType: 'ciclos_list' })
  const anyRefreshing = ciclosList.refreshing

  useEffect(() => {
    const ciclos = ciclosList.data?.ciclos
    if (ciclos && ciclos.length > 0 && !filters.ciclo) {
      setFilters({ ciclo: ciclos[ciclos.length - 1].ciclo })
    }
  }, [ciclosList.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const overview = useVDQuery<{
    kpis: { receita_bruta: number; receita_liquida: number; volume: number; pedidos: number; revendedoras_ativas: number }
    por_marca: Array<{ marca: string; receita_bruta: number; pct: number }>
    por_meio_captacao: Array<{ meio: string; receita_bruta: number }>
  }>({ queryType: 'overview', filters, enabled: !!filters.ciclo })

  const revendedoras = useVDQuery<{ data: unknown[]; total: number }>({
    queryType: 'revendedoras', filters, page: revPage, pageSize: 50,
    enabled: activeTab === 'revendedoras' && !!filters.ciclo,
  })

  const supervisores = useVDQuery<{ data: unknown[] }>({
    queryType: 'supervisores', filters,
    enabled: activeTab === 'supervisores' && !!filters.ciclo,
  })

  const estruturas = useVDQuery<{ data: unknown[] }>({
    queryType: 'estruturas', filters,
    enabled: activeTab === 'estruturas' && !!filters.ciclo,
  })

  const produtos = useVDQuery<{ por_secao: unknown[]; por_marca: unknown[]; por_meio: unknown[]; por_entrega: unknown[] }>({
    queryType: 'produtos', filters,
    enabled: activeTab === 'produtos' && !!filters.ciclo,
  })

  const ciclosDisponiveis = (ciclosList.data?.ciclos ?? []).map(c => c.ciclo)
  const marcasDisponiveis = (overview.data?.por_marca ?? []).map(m => m.marca)

  const handleFilters = (f: VDFiltersType) => { setFilters(f); setRevPage(0) }

  const handleRefresh = () => {
    ciclosList.refetch(); overview.refetch()
    if (activeTab === 'revendedoras') revendedoras.refetch()
    if (activeTab === 'supervisores') supervisores.refetch()
    if (activeTab === 'estruturas')   estruturas.refetch()
    if (activeTab === 'produtos')     produtos.refetch()
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Venda Direta</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Analise de desempenho da rede de revendedoras
          </p>
        </div>
        <div className="flex items-center gap-3">
          {anyRefreshing && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              Atualizando...
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2
              text-xs font-medium text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200
              transition-colors"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <VDFilters
        filters={filters}
        onChange={handleFilters}
        ciclosDisponiveis={ciclosDisponiveis}
        marcasDisponiveis={marcasDisponiveis}
      />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-1">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 flex-1 min-w-0 justify-center rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                active
                  ? 'franchise-nav-active text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Conteudo */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab
            data={overview.data ?? null}
            loading={overview.loading || (!filters.ciclo && ciclosList.loading)}
            error={overview.error}
            ciclosData={ciclosList.data?.ciclos ?? []}
            selectedCiclo={filters.ciclo}
          />
        )}
        {activeTab === 'revendedoras' && (
          <RevendedorasTab
            data={revendedoras.data as { data: import('../../../types').VDRevendedora[]; total: number } | null}
            loading={revendedoras.loading}
            error={revendedoras.error}
            page={revPage}
            pageSize={50}
            onPageChange={setRevPage}
          />
        )}
        {activeTab === 'supervisores' && (
          <SupervisoresTab
            data={supervisores.data as { data: import('../../../types').VDSupervisor[] } | null}
            loading={supervisores.loading}
            error={supervisores.error}
          />
        )}
        {activeTab === 'estruturas' && (
          <EstruturasTab
            data={estruturas.data as { data: { cod_estrutura: number; nome_estrutura: string; cod_pdv: number; cidade: string; revendedoras: number; receita_bruta: number; receita_liquida: number; volume: number }[] } | null}
            loading={estruturas.loading}
            error={estruturas.error}
          />
        )}
        {activeTab === 'produtos' && (
          <ProdutosTab
            data={produtos.data as { por_secao: { secao: string; receita_bruta: number; volume: number }[]; por_marca: { marca: string; receita_bruta: number; volume: number }[]; por_meio: { meio: string; receita_bruta: number; pedidos: number }[]; por_entrega: { tipo: string; receita_bruta: number }[] } | null}
            loading={produtos.loading}
            error={produtos.error}
          />
        )}
      </div>
    </div>
  )
}
