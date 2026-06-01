/**
 * AnkLogo — Logotipo vetorial oficial da ANK Data.
 *
 * Variantes:
 *   - dark   : mark em #32343A (uso em fundo branco/claro)
 *   - light  : mark em branco (uso em fundo escuro)
 *   - color  : mark em #5086C6 (uso especial)
 *
 * Uso:
 *   <AnkLogo variant="dark" height={48} />
 */

interface AnkLogoProps {
  variant?: 'dark' | 'light' | 'color'
  height?: number
  className?: string
  /** Exibe apenas o símbolo sem o texto "DATA" */
  markOnly?: boolean
}

const COLORS = {
  dark:  { mark: '#32343A', sub: '#888888' },
  light: { mark: '#FFFFFF', sub: 'rgba(255,255,255,0.5)' },
  color: { mark: '#5086C6', sub: '#888888' },
}

export default function AnkLogo({
  variant = 'dark',
  height = 48,
  className,
  markOnly = false,
}: AnkLogoProps) {
  const { mark, sub } = COLORS[variant]
  const w = markOnly ? height * (200 / 230) : height * (200 / 280)

  return (
    <svg
      viewBox={markOnly ? '0 0 200 230' : '0 0 200 280'}
      height={height}
      width={w}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ANK Data"
      fill="none"
    >
      {/* ── Stroke principal esquerdo (perna esquerda do A) ─────────────── */}
      <line
        x1="25"  y1="220"
        x2="108" y2="18"
        stroke={mark} strokeWidth="13" strokeLinecap="square"
      />

      {/* ── Stroke central (perna direita do A / haste vertical do K) ────── */}
      <line
        x1="108" y1="18"
        x2="108" y2="220"
        stroke={mark} strokeWidth="13" strokeLinecap="square"
      />

      {/* ── Arco do "n" (semicírculo entre os strokes) ──────────────────── */}
      <path
        d="M 55 185 A 53 53 0 0 1 161 185"
        stroke={mark} strokeWidth="13" strokeLinecap="square" fill="none"
      />

      {/* ── Diagonal superior direita do K ──────────────────────────────── */}
      <line
        x1="108" y1="100"
        x2="178" y2="18"
        stroke={mark} strokeWidth="13" strokeLinecap="square"
      />

      {/* ── Diagonal inferior direita do K ──────────────────────────────── */}
      <line
        x1="108" y1="100"
        x2="178" y2="220"
        stroke={mark} strokeWidth="13" strokeLinecap="square"
      />

      {/* ── Texto "DATA" ─────────────────────────────────────────────────── */}
      {!markOnly && (
        <text
          x="100"
          y="268"
          textAnchor="middle"
          fontFamily="'Inter', 'Helvetica Neue', sans-serif"
          fontSize="22"
          fontWeight="400"
          letterSpacing="10"
          fill={sub}
        >
          DATA
        </text>
      )}
    </svg>
  )
}
