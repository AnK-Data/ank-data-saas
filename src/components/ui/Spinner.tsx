import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** Render centered over the full viewport */
  fullScreen?: boolean
  className?: string
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

export default function Spinner({ size = 'md', fullScreen, className }: SpinnerProps) {
  const spinner = (
    <div
      className={clsx(
        'animate-spin rounded-full border-slate-200 border-t-ank-600',
        sizes[size],
        className,
      )}
      role="status"
      aria-label="Carregando"
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <span className="text-sm text-slate-500">Carregando…</span>
        </div>
      </div>
    )
  }

  return spinner
}
