import { useState, useCallback, type FormEvent } from 'react'
import { Cog8ToothIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import { useTheme } from '../../contexts/ThemeContext'

const ANK_PRIMARY   = '#5086C6'
const ANK_SECONDARY = '#32343A'

/** Aplica as cores do Admin ROOT via CSS variables no :root */
export function applyAdminColors(primary: string, sidebar: string) {
  const root = document.documentElement
  root.style.setProperty('--admin-primary',      primary)
  root.style.setProperty('--admin-sidebar',       sidebar)
  root.style.setProperty('--admin-primary-dark',  adjustBrightness(primary, -25))
  root.style.setProperty('--admin-primary-light', adjustBrightness(primary, 40))
}

function adjustBrightness(hex: string, amount: number): string {
  const clean = hex.replace('#', '').padEnd(6, '0')
  const num = parseInt(clean, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Carrega e aplica as cores salvas (chame ao montar o AdminLayout) */
export function loadAdminColors() {
  const p = localStorage.getItem('ank_admin_primary')   ?? ANK_PRIMARY
  const s = localStorage.getItem('ank_admin_secondary') ?? ANK_SECONDARY
  applyAdminColors(p, s)
}

export default function AdminConfigPage() {
  const { theme, toggleTheme } = useTheme()

  const saved1 = localStorage.getItem('ank_admin_primary')   ?? ANK_PRIMARY
  const saved2 = localStorage.getItem('ank_admin_secondary') ?? ANK_SECONDARY

  const [primary,   setPrimary]   = useState(saved1)
  const [secondary, setSecondary] = useState(saved2)
  const [saving, setSaving]       = useState(false)

  const applyColors = useCallback((p: string, s: string) => {
    applyAdminColors(p, s)
  }, [])

  function handleColor(type: 'primary' | 'secondary', value: string) {
    if (type === 'primary') { setPrimary(value);   applyColors(value, secondary) }
    else                    { setSecondary(value);  applyColors(primary, value) }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    localStorage.setItem('ank_admin_primary',   primary)
    localStorage.setItem('ank_admin_secondary', secondary)
    applyColors(primary, secondary)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    toast.success('Configurações salvas!')
  }

  function resetColors() {
    setPrimary(ANK_PRIMARY); setSecondary(ANK_SECONDARY)
    localStorage.removeItem('ank_admin_primary'); localStorage.removeItem('ank_admin_secondary')
    applyColors(ANK_PRIMARY, ANK_SECONDARY)
    toast('Cores restauradas ao padrão AnK Data.')
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Configuração Global</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Personalize a aparência do Painel Admin ROOT
          </p>
        </div>
        <Button type="submit" loading={saving}>💾 Salvar Alterações</Button>
      </div>

      {/* Identidade Visual */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
          Identidade Visual
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Cor primária */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cor Primária</label>
            <div className="flex items-center gap-3">
              <input type="color" value={primary}
                onChange={e => handleColor('primary', e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600 p-0.5 bg-white" />
              <div>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-200">{primary}</p>
                <p className="text-xs text-slate-400">Botões, links ativos e nav</p>
              </div>
            </div>
            {/* Swatch preview */}
            <div className="h-8 rounded-xl transition-colors" style={{ backgroundColor: primary }} />
          </div>

          {/* Cor da sidebar */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cor da Sidebar</label>
            <div className="flex items-center gap-3">
              <input type="color" value={secondary}
                onChange={e => handleColor('secondary', e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600 p-0.5 bg-white" />
              <div>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-200">{secondary}</p>
                <p className="text-xs text-slate-400">Fundo da barra lateral</p>
              </div>
            </div>
            <div className="h-8 rounded-xl transition-colors" style={{ backgroundColor: secondary }} />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-ank-50 dark:bg-ank-950/30 border border-ank-200 dark:border-ank-800 px-4 py-3 text-xs text-ank-700 dark:text-ank-400">
          💡 <strong>White Label Dinâmico:</strong> As cores são aplicadas em tempo real ao mover o color picker.
        </div>

        <button type="button" onClick={resetColors}
          className="mt-3 text-xs text-slate-400 hover:text-red-500 transition-colors">
          ↺ Restaurar padrão AnK Data ({ANK_PRIMARY} / {ANK_SECONDARY})
        </button>
      </div>

      {/* Aparência */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
          Aparência do sistema
        </p>

        <div className="flex items-center gap-2 mb-3">
          <Cog8ToothIcon className="h-4 w-4 text-slate-400" />
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Modo de exibição</label>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {[
            { value: 'light', label: '☀️ Modo Claro',  desc: 'Fundo branco' },
            { value: 'dark',  label: '🌙 Modo Escuro', desc: 'Fundo escuro' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { if (theme !== opt.value) toggleTheme() }}
              className={`flex flex-col items-start p-4 rounded-xl border-2 transition-colors text-left
                ${theme === opt.value
                  ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}>
              <span className="text-base mb-0.5">{opt.label.split(' ')[0]}</span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {opt.label.split(' ').slice(1).join(' ')}
              </span>
              <span className="text-[10px] text-slate-400">{opt.desc}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">Preferência salva localmente no seu navegador.</p>
      </div>

    </form>
  )
}
