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
  success:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning:  'bg-amber-50  text-amber-700  ring-amber-600/20',
  critical: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  danger:   'bg-red-50    text-red-700    ring-red-600/20',
  neutral:  'bg-slate-50  text-slate-700  ring-slate-600/20',
  info:     'bg-blue-50   text-blue-700   ring-blue-600/20',
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

