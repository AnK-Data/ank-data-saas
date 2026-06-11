import { useState } from 'react'
import FolhaVDSetor from './FolhaVDSetor'

type SetorId = 'vd' | 'varejo' | 'logistica'

const SETORES: { id: SetorId; label: string }[] = [
  { id: 'vd',        label: 'Venda Direta' },
  { id: 'varejo',    label: 'Varejo'        },
  { id: 'logistica', label: 'Logistica'     },
]

const tabBtn = (active: boolean) =>
  `px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap ` +
  (active
    ? 'franchise-nav-active text-white shadow-sm'
    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')

function EmBreve({ setor }: { setor: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-2xl">
        🚧
      </div>
      <p className="text-slate-600 dark:text-slate-400 font-medium">Setor {setor}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Em desenvolvimento — em breve disponivel</p>
    </div>
  )
}

export default function FolhaPage() {
  const [setor, setSetor] = useState<SetorId>('vd')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Folha</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Desempenho e comissionamento por setor</p>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {SETORES.map(s => (
          <button key={s.id} onClick={() => setSetor(s.id)} className={tabBtn(setor === s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {setor === 'vd'        && <FolhaVDSetor />}
        {setor === 'varejo'    && <EmBreve setor="Varejo" />}
        {setor === 'logistica' && <EmBreve setor="Logistica" />}
      </div>
    </div>
  )
}
