import { useState, useEffect } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { getMenuPrefs, saveMenuPrefs, clearMenuPrefs } from '../../lib/menuPrefs'

interface MenuItem {
  id: string
  label: string
  slug: string
  visible: boolean
  order: number
}

const BASE_ITEMS: MenuItem[] = [
  { id: '1', label: 'Dashboard',  slug: 'dashboard',  visible: true, order: 1 },
  { id: '2', label: 'Vendas',     slug: 'vendas',     visible: true, order: 2 },
  { id: '3', label: 'Estoque',    slug: 'estoque',    visible: true, order: 3 },
  { id: '4', label: 'CRM',        slug: 'crm',        visible: true, order: 4 },
  { id: '5', label: 'Financeiro', slug: 'financeiro', visible: true, order: 5 },
  { id: '6', label: 'Upload',       slug: 'upload',       visible: true, order: 6 },
  { id: '7', label: 'Venda Direta', slug: 'venda-direta', visible: true, order: 7 },
]

function mergeWithSaved(tenantId: string): MenuItem[] {
  const saved = getMenuPrefs(tenantId)
  if (!saved) return [...BASE_ITEMS]

  return BASE_ITEMS
    .map(item => ({
      ...item,
      visible: saved[item.slug]?.visible ?? item.visible,
      order:   saved[item.slug]?.order   ?? item.order,
    }))
    .sort((a, b) => a.order - b.order)
}

export default function ConfigurarMenuPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? ''

  const [items, setItems] = useState<MenuItem[]>(() => mergeWithSaved(tenantId))
  const [saving, setSaving]   = useState(false)
  const [changed, setChanged] = useState(false)

  // Recarrega se o tenant mudar
  useEffect(() => {
    if (tenantId) setItems(mergeWithSaved(tenantId))
  }, [tenantId])

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
    // Converte array em objeto slug → {visible, order} e persiste
    const prefs: Record<string, { visible: boolean; order: number }> = {}
    items.forEach(item => { prefs[item.slug] = { visible: item.visible, order: item.order } })
    saveMenuPrefs(tenantId, prefs)

    // Pequeno delay para simular feedback
    setTimeout(() => {
      setSaving(false)
      setChanged(false)
      toast.success('Preferências salvas! O menu foi atualizado.')
      // Força reload do componente do sidebar via evento customizado
      window.dispatchEvent(new CustomEvent('ank:menu-prefs-updated'))
    }, 400)
  }

  function handleReset() {
    clearMenuPrefs(tenantId)
    const reset = [...BASE_ITEMS]
    setItems(reset)
    setChanged(true)
    toast('Menu restaurado ao padrão. Salve para confirmar.')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Configurar Menu</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Ative/desative e reordene os itens do menu lateral
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Restaurar padrão
          </Button>
          <Button size="sm" loading={saving} onClick={handleSave}
            className={changed ? '' : 'opacity-60'}>
            💾 Salvar preferências
          </Button>
        </div>
      </div>

      {/* Lista de módulos */}
      <Card padding={false}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/50 dark:divide-slate-800">
          {items.map((item, idx) => (
            <li key={item.id}
              className="flex items-center gap-4 px-5 py-4
                bg-white dark:bg-slate-900 transition-colors">

              {/* Número de ordem */}
              <span className="w-6 text-center text-xs text-slate-400 dark:text-slate-500 font-mono shrink-0">
                {item.order}
              </span>

              {/* Nome do módulo */}
              <span className={`flex-1 text-sm font-medium transition-all ${
                item.visible
                  ? 'text-slate-800 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-500 line-through'
              }`}>
                {item.label}
              </span>

              {/* Botões de ordem */}
              <div className="flex flex-col gap-0 shrink-0">
                <button
                  onClick={() => moveUp(item.id)}
                  disabled={idx === 0}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                    disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Mover para cima"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(item.id)}
                  disabled={idx === items.length - 1}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                    disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Mover para baixo"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {/* Toggle visível */}
              <button
                onClick={() => toggle(item.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
                  transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                  ${item.visible ? 'franchise-btn-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                aria-label={item.visible ? 'Desativar' : 'Ativar'}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                  transition-transform duration-200
                  ${item.visible ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Itens desativados ficam ocultos no menu lateral. As alterações são aplicadas imediatamente após salvar.
      </p>
    </div>
  )
}
