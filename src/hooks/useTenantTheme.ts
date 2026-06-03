import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

/**
 * Spec 11 — White Label Dinâmico.
 * Carrega as cores da franquia do banco e injeta CSS no documento.
 */
export function useTenantTheme() {
  const { profile } = useAuth()

  useEffect(() => {
    if (!profile?.tenant_id) return

    supabase
      .from('tenants')
      .select('cor_primaria, cor_secundaria')
      .eq('id', profile.tenant_id)
      .single()
      .then(({ data }) => {
        applyFranchiseColors(
          data?.cor_primaria  ?? '#2563eb',
          data?.cor_secundaria ?? '#06b6d4',
        )
      })
  }, [profile?.tenant_id])
}

/** Injeta CSS variables + classes reutilizáveis no documento */
export function applyFranchiseColors(primary: string, secondary: string) {
  // 1. CSS variables no :root
  const root = document.documentElement
  root.style.setProperty('--fp-primary',      primary)
  root.style.setProperty('--fp-secondary',     secondary)
  root.style.setProperty('--fp-primary-dark',  adjustBrightness(primary, -25))
  root.style.setProperty('--fp-primary-light', adjustBrightness(primary,  40))

  // 2. <style> tag com classes usadas nos componentes
  let tag = document.getElementById('ank-franchise-theme') as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = 'ank-franchise-theme'
    document.head.appendChild(tag)
  }

  tag.textContent = `
    /* ─── AnK Data — Franchise Theme (Spec 11) ─── */
    :root {
      --fp-primary:       ${primary};
      --fp-secondary:     ${secondary};
      --fp-primary-dark:  ${adjustBrightness(primary, -25)};
      --fp-primary-light: ${adjustBrightness(primary,  40)};
    }

    /* Botão primário */
    .franchise-btn-primary {
      background-color: var(--fp-primary) !important;
      color: #ffffff !important;
    }
    .franchise-btn-primary:hover {
      background-color: var(--fp-primary-dark) !important;
    }

    /* Nav link ativo na sidebar e sub-menu */
    .franchise-nav-active {
      background-color: var(--fp-primary) !important;
      color: #ffffff !important;
    }
    .franchise-nav-active:hover {
      background-color: var(--fp-primary-dark) !important;
    }
    .franchise-nav-active svg {
      color: #ffffff !important;
    }

    /* Tabs ativas */
    .franchise-tab-active {
      border-color: var(--fp-primary) !important;
      color: var(--fp-primary) !important;
    }

    /* Links e destaques */
    .franchise-accent {
      color: var(--fp-primary) !important;
    }
    .franchise-accent-bg {
      background-color: color-mix(in srgb, var(--fp-primary) 12%, transparent) !important;
    }

    /* Checkbox e toggle */
    input[type="checkbox"]:checked {
      accent-color: var(--fp-primary);
    }
  `
}

function adjustBrightness(hex: string, amount: number): string {
  const clean = hex.replace('#', '').padEnd(6, '0')
  const num = parseInt(clean, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
