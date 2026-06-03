import { useState } from 'react'
import toast from 'react-hot-toast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

interface AdminMenuItem {
  id: string
  label: string
  slug: string
  visible: boolean
  order: number
}

const BASE_ITEMS: AdminMenuItem[] = [
  { id: '1', label: 'Dashboard',   slug: 'dashboard',   visible: true, order: 1 },
  { id: '2', label: 'Franquias',   slug: 'tenants',     visible: true, order: 2 },
  { id: '3', label: 'Licenças',    slug: 'licenses',    visible: true, order: 3 },
  { id: '4', label: 'Usuários',    slug: 'users',       visible: true, order: 4 },
  { id: '5', label: 'Conformidade',slug: 'compliance',  visible: true, order: 5 },
]

const STORAGE_KEY = 'ank_admin_menu_prefs'

function loadPrefs(): AdminMenuItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return BASE_ITEMS
    const prefs = JSON.parse(saved)
    return BASE_ITEMS
      .map(item => ({
        ...item,
        visible: prefs[item.slug]?.visible ?? item.visible,
        order:   prefs[item.slug]?.order   ?? item.order,
      }))
      .sort((a, b) => a.order - b.order)
  } catch { return BASE_ITEMS }
}

export default function AdminMenuPage() {
  const [items, setItems]   = useState<AdminMenuItem[]>(loadPrefs)
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState(false)

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, visible: !i.visible } : i))
    setChanged(true)
  }

  function moveUp(id: string) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx <= 0) return prev
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr.map((item, i) => ({ ...item, order: i + 1 }))
    })
    setChanged(true)
  }

  function moveDown(id: string) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr.map((item, i) => ({ ...item, order: i + 1 }))
    })
    setChanged(true)
  }

  function handleSave() {
    setSaving(true)
    const prefs: Record<string, { visible: boolean; order: number }> = {}
    items.forEach(item => { prefs[item.slug] = { visible: item.visible, order: item.order } })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    setTimeout(() => {
      setSaving(false)
      setChanged(false)
      toast.success('Menu atualizado!')
      // Notifica o sidebar para re-renderizar imediatamente
      window.dispatchEvent(new CustomEvent('ank:admin-menu-updated'))
    }, 400)
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY)
    setItems([...BASE_ITEMS])
    setChanged(true)
    toast('Menu restaurado ao padrão.')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Organizar Menu</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Reordene e mostre/oculte itens do menu do Admin ROOT
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleReset}>Restaurar padrão</Button>
          <Button size="sm" loading={saving} onClick={handleSave}
            className={changed ? '' : 'opacity-60'}>
            💾 Salvar
          </Button>
        </div>
      </div>

      <Card padding={false}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/50 dark:divide-slate-800">
          {items.map((item, idx) => (
            <li key={item.id}
              className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-slate-900 transition-colors">

              <span className="w-6 text-center text-xs text-slate-400 font-mono shrink-0">
                {item.order}
              </span>

              <span className={`flex-1 text-sm font-medium transition-all
                ${item.visible
                  ? 'text-slate-800 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                {item.label}
              </span>

              {/* Setas */}
              <div className="flex flex-col gap-0 shrink-0">
                <button onClick={() => moveUp(item.id)} disabled={idx === 0}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                    disabled:opacity-20 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button onClick={() => moveDown(item.id)} disabled={idx === items.length - 1}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                    disabled:opacity-20 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {/* Toggle */}
              <button onClick={() => toggle(item.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
                  transition-colors duration-200 focus:outline-none
                  ${item.visible ? 'bg-ank-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                  transition-transform duration-200
                  ${item.visible ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Itens desativados ficam ocultos na sidebar. Salve e recarregue para aplicar.
      </p>
    </div>
  )
}
