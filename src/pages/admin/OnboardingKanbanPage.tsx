import { useEffect, useState, useCallback } from 'react'
import { ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'
import type { Score } from './ClientesListPage'
import { SCORE_CONFIG } from './ClientesListPage'

// ─── Etapas do Kanban de Implantação ────────────────────────────────────────

interface KanbanStage {
  id: string
  label: string
  desc: string
  color: string
  accent: string
  emoji: string
}

const STAGES: KanbanStage[] = [
  {
    id:     'inicio',
    label:  'Contrato Assinado',
    desc:   'Aguardando início da implantação',
    emoji:  '✍️',
    color:  'border-blue-400 dark:border-blue-600',
    accent: 'bg-blue-400',
  },
  {
    id:     'configurando',
    label:  'Configurando',
    desc:   'Criando lojas, usuários e configurações',
    emoji:  '⚙️',
    color:  'border-amber-400 dark:border-amber-600',
    accent: 'bg-amber-400',
  },
  {
    id:     'treinamento',
    label:  'Treinamento',
    desc:   'Equipe da franquia sendo treinada',
    emoji:  '🎓',
    color:  'border-violet-400 dark:border-violet-600',
    accent: 'bg-violet-400',
  },
  {
    id:     'primeiro_acesso',
    label:  'Primeiro Upload',
    desc:   'Aguardando primeiro arquivo de vendas',
    emoji:  '📤',
    color:  'border-orange-400 dark:border-orange-600',
    accent: 'bg-orange-400',
  },
  {
    id:     'operacional',
    label:  'Operacional',
    desc:   'Usando o sistema regularmente',
    emoji:  '🚀',
    color:  'border-emerald-400 dark:border-emerald-600',
    accent: 'bg-emerald-400',
  },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface KanbanCard {
  id: string
  nome_franquia: string
  codigo_cp: string | null
  plano: string | null
  score: Score
  implantacao: number
  responsavel: string | null
  kanban_stage: string
  situacao: string
  created_at: string
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OnboardingKanbanPage() {
  const [cards, setCards]       = useState<KanbanCard[]>([])
  const [loading, setLoading]   = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [hovering, setHovering] = useState<string | null>(null)

  const fetchCards = useCallback(async () => {
    const { data } = await supabase
      .from('tenants')
      .select('id, nome_franquia, codigo_cp, plano, score, implantacao, responsavel, kanban_stage, situacao, created_at')
      .neq('situacao', 'cancelado')
      .eq('ativo', true)
      .order('nome_franquia')
    setCards((data ?? []) as KanbanCard[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  async function moveCard(id: string, stage: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, kanban_stage: stage } : c))
    const { error } = await supabase
      .from('tenants')
      .update({ kanban_stage: stage })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao mover card.')
      fetchCards()
    }
  }

  async function updateImplantacao(id: string, value: number) {
    await supabase.from('tenants').update({ implantacao: value }).eq('id', id)
    setCards(prev => prev.map(c => c.id === id ? { ...c, implantacao: value } : c))
  }

  const cardsNoStage = cards.filter(c =>
    !STAGES.find(s => s.id === c.kanban_stage) || !c.kanban_stage
  )

  if (loading) return <Spinner fullScreen />

  const totalAtivos = cards.length
  const concluidos  = cards.filter(c => c.kanban_stage === 'operacional').length
  const emAndamento = totalAtivos - concluidos

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40 text-xl">
            🗂️
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kanban de Implantação</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Acompanhamento de cada cliente no processo de implantação ANK Data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Mini stats */}
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span><strong className="text-slate-800 dark:text-slate-200">{emAndamento}</strong> em andamento</span>
            <span><strong className="text-emerald-600">{concluidos}</strong> operacionais</span>
          </div>
          <button onClick={() => { setLoading(true); fetchCards() }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700
              px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400
              hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ArrowPathIcon className="h-4 w-4" />
            Recarregar
          </button>
        </div>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center
          rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <span className="text-4xl mb-4">🗂️</span>
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nenhum cliente em implantação no momento.
          </p>
          <p className="text-sm text-slate-400 max-w-sm">
            Clientes cadastrados em{' '}
            <strong>Clientes → Lista</strong>{' '}
            aparecerão aqui automaticamente quando estiverem ativos.
          </p>
        </div>
      )}

      {/* Board */}
      {cards.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageCards = cards.filter(c =>
              c.kanban_stage === stage.id ||
              (!c.kanban_stage && stage.id === 'inicio')
            )
            const isHovering = hovering === stage.id

            return (
              <div key={stage.id}
                className={`flex flex-col rounded-2xl border-t-4 ${stage.color}
                  border border-slate-200 dark:border-slate-700
                  bg-slate-50 dark:bg-slate-900
                  min-w-[260px] max-w-[280px] flex-shrink-0
                  transition-all duration-150
                  ${isHovering ? 'ring-2 ring-offset-2 ring-ank-400 dark:ring-ank-500 scale-[1.01]' : ''}`}
                onDragOver={e => { e.preventDefault(); setHovering(stage.id) }}
                onDragLeave={() => setHovering(null)}
                onDrop={e => {
                  e.preventDefault()
                  setHovering(null)
                  const id = e.dataTransfer.getData('cardId')
                  if (id) moveCard(id, stage.id)
                }}
              >
                {/* Cabeçalho da coluna */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{stage.emoji}</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{stage.label}</p>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full
                      text-[10px] font-bold text-white"
                      style={{ backgroundColor: stage.accent.replace('bg-', '') }}
                    >
                      <span className={`${stage.accent} h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold`}>
                        {stageCards.length}
                      </span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-7">{stage.desc}</p>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-2 min-h-[120px]">
                  {stageCards.map(card => (
                    <KanbanCardComponent
                      key={card.id}
                      card={card}
                      stageColor={stage.accent}
                      onDragStart={() => setDragging(card.id)}
                      onDragEnd={() => setDragging(null)}
                      onUpdateImplantacao={updateImplantacao}
                      isDragging={dragging === card.id}
                    />
                  ))}

                  {stageCards.length === 0 && (
                    <div className={`flex items-center justify-center h-16 rounded-xl
                      border-2 border-dashed text-xs text-slate-400 dark:text-slate-500
                      ${isHovering ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30 text-ank-600' : 'border-slate-200 dark:border-slate-700'}`}>
                      {isHovering ? 'Solte aqui' : 'Arraste um cliente aqui'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Clientes sem etapa definida */}
      {cardsNoStage.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">
            Sem etapa definida ({cardsNoStage.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {cardsNoStage.map(c => (
              <button key={c.id}
                onClick={() => moveCard(c.id, 'inicio')}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                  px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:border-ank-400 transition-colors">
                {c.nome_franquia} <span className="text-slate-400 ml-1">→ mover para Início</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card do Kanban ───────────────────────────────────────────────────────────

function KanbanCardComponent({ card, stageColor, onDragStart, onDragEnd, onUpdateImplantacao, isDragging }: {
  card: KanbanCard
  stageColor: string
  onDragStart: () => void
  onDragEnd: () => void
  onUpdateImplantacao: (id: string, v: number) => void
  isDragging: boolean
}) {
  const [editingImpl, setEditingImpl] = useState(false)
  const [implVal, setImplVal]         = useState(card.implantacao)
  const scoreCfg = SCORE_CONFIG[card.score ?? 'normal'] ?? SCORE_CONFIG.normal

  function saveImpl() {
    onUpdateImplantacao(card.id, implVal)
    setEditingImpl(false)
  }

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('cardId', card.id); onDragStart() }}
      onDragEnd={onDragEnd}
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
        p-3.5 shadow-sm cursor-grab active:cursor-grabbing select-none
        transition-all duration-150
        ${isDragging ? 'opacity-40 scale-95' : 'hover:shadow-md hover:-translate-y-0.5'}`}
    >
      {/* Nome + Score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {card.nome_franquia}
        </p>
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${scoreCfg.dot}`} title={scoreCfg.label} />
      </div>

      {/* Plano + CP */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {card.plano && (
          <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-700
            text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5">
            {card.plano}
          </span>
        )}
        {card.codigo_cp && (
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
            CP: {card.codigo_cp}
          </span>
        )}
      </div>

      {/* Barra de implantação */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Implantação</span>
          <button
            onClick={e => { e.stopPropagation(); setEditingImpl(true) }}
            className="text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-ank-600 transition-colors flex items-center gap-0.5"
          >
            {card.implantacao}%
            <PencilSquareIcon className="h-2.5 w-2.5 opacity-60" />
          </button>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${card.implantacao}%`, backgroundColor: card.implantacao === 100 ? '#22c55e' : 'var(--admin-primary, #5086C6)' }}
          />
        </div>
      </div>

      {/* Editor de implantação inline */}
      {editingImpl && (
        <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <input type="range" min={0} max={100} step={5} value={implVal}
            onChange={e => setImplVal(Number(e.target.value))}
            className="flex-1 accent-ank-600 h-1.5" />
          <span className="text-xs font-bold text-ank-600 w-8 text-right">{implVal}%</span>
          <button onClick={saveImpl}
            className="text-[10px] font-medium bg-ank-600 text-white rounded-lg px-2 py-1">
            OK
          </button>
        </div>
      )}

      {/* Responsável */}
      {card.responsavel && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 truncate">
          👤 {card.responsavel}
        </p>
      )}
    </div>
  )
}
