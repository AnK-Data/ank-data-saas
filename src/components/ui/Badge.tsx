import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import type { LicenseStatus, ComplianceStatus } from '../../types'

type BadgeVariant = 'success' | 'warning' | 'critical' | 'danger' | 'neutral' | 'info'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  success:  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-500/30',
  warning:  'bg-amber-50  dark:bg-amber-950/40  text-amber-700  dark:text-amber-400  ring-amber-600/20  dark:ring-amber-500/30',
  critical: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 ring-orange-600/20 dark:ring-orange-500/30',
  danger:   'bg-red-50    dark:bg-red-950/40    text-red-700    dark:text-red-400    ring-red-600/20    dark:ring-red-500/30',
  neutral:  'bg-slate-50  dark:bg-slate-800     text-slate-700  dark:text-slate-300  ring-slate-600/20  dark:ring-slate-500/30',
  info:     'bg-blue-50   dark:bg-blue-950/40   text-blue-700   dark:text-blue-400   ring-blue-600/20   dark:ring-blue-500/30',
}

export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ─── Domain-specific helpers ───────────────────────────────────────────────────

export function LicenseBadge({ status }: { status: LicenseStatus }) {
  const map: Record<LicenseStatus, { variant: BadgeVariant; label: string }> = {
    ACTIVE:    { variant: 'success',  label: 'Ativa' },
    ALERT:     { variant: 'warning',  label: 'Alerta' },
    CRITICAL:  { variant: 'critical', label: 'Crítica' },
    EXPIRED:   { variant: 'danger',   label: 'Expirada' },
    SUSPENDED: { variant: 'neutral',  label: 'Suspensa' },
  }
  const { variant, label } = map[status] ?? { variant: 'neutral', label: status }
  return <Badge variant={variant}>{label}</Badge>
}

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  return status === 'OK'
    ? <Badge variant="success">OK</Badge>
    : <Badge variant="danger">COMPROMETIDO</Badge>
}
