/**
 * Preferências de menu por franquia — persistidas em localStorage.
 * Slug → { visible, order }
 */

export interface ModulePref {
  visible: boolean
  order: number
}

const KEY = 'ank_menu_prefs'

export function getMenuPrefs(tenantId: string): Record<string, ModulePref> | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const all = JSON.parse(raw) as Record<string, Record<string, ModulePref>>
    return all[tenantId] ?? null
  } catch {
    return null
  }
}

export function saveMenuPrefs(tenantId: string, prefs: Record<string, ModulePref>) {
  try {
    const raw = localStorage.getItem(KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, ModulePref>>) : {}
    all[tenantId] = prefs
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* noop */ }
}

export function clearMenuPrefs(tenantId: string) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const all = JSON.parse(raw) as Record<string, Record<string, ModulePref>>
    delete all[tenantId]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* noop */ }
}
