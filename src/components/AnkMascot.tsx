interface AnkMascotProps {
  className?: string
  height?: number
}

/**
 * Ankito — Mascote oficial da AnK Data.
 * Design futurista: corpo angular com armadura, visor neon cyan,
 * núcleo de energia hexagonal e detalhes de circuito.
 */
export default function AnkMascot({ className, height }: AnkMascotProps) {
  return (
    <svg
      viewBox="0 0 200 290"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={height ? { height, width: 'auto' } : undefined}
      aria-label="Ankito — mascote futurista da AnK Data"
    >
      <defs>
        {/* Metálico escuro — brand dark #32343A */}
        <linearGradient id="darkMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#3d4047" />
          <stop offset="50%"  stopColor="#32343A" />
          <stop offset="100%" stopColor="#26282d" />
        </linearGradient>

        {/* Armadura — brand blue #5086C6 */}
        <linearGradient id="armorBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#6699d4" />
          <stop offset="100%" stopColor="#3e6eb3" />
        </linearGradient>

        {/* Visor neon */}
        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#0c4a6e" />
          <stop offset="25%"  stopColor="#5086C6" />
          <stop offset="50%"  stopColor="#e0f2fe" />
          <stop offset="75%"  stopColor="#5086C6" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>

        {/* Núcleo de energia */}
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#e0f2fe" />
          <stop offset="30%"  stopColor="#6699d4" />
          <stop offset="70%"  stopColor="#5086C6" />
          <stop offset="100%" stopColor="#32343A" stopOpacity="0" />
        </radialGradient>

        {/* Glow do visor */}
        <filter id="visorGlow" x="-40%" y="-120%" width="180%" height="440%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Glow suave para detalhes */}
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Sombra ──────────────────────────────────────────────────── */}
      <ellipse cx="100" cy="286" rx="54" ry="7" fill="#5086C6" opacity="0.12" />
      <ellipse cx="100" cy="286" rx="40" ry="4" fill="#0c1629" opacity="0.3" />

      {/* ── Antenas angulares ────────────────────────────────────────── */}
      {/* Esquerda */}
      <polygon points="87,36 83,8 89,8 92,36" fill="url(#armorBlue)" />
      <polygon points="83,8 89,8 87,16 85,16" fill="#6699d4" filter="url(#softGlow)" />
      <circle cx="86" cy="7" r="3.5" fill="#6699d4" filter="url(#softGlow)" />

      {/* Direita */}
      <polygon points="113,36 111,8 117,8 113,36" fill="url(#armorBlue)" />
      <polygon points="111,8 117,8 115,16 113,16" fill="#6699d4" filter="url(#softGlow)" />
      <circle cx="114" cy="7" r="3.5" fill="#6699d4" filter="url(#softGlow)" />

      {/* ── Cabeça (octógono angular) ────────────────────────────────── */}
      {/* Sombra da cabeça */}
      <polygon
        points="62,34 138,34 150,46 150,96 138,108 62,108 50,96 50,46"
        fill="#050d1a"
        transform="translate(2,3)"
        opacity="0.5"
      />
      {/* Forma principal */}
      <polygon
        points="62,32 138,32 150,44 150,94 138,106 62,106 50,94 50,44"
        fill="url(#darkMetal)"
        stroke="#3e6eb3"
        strokeWidth="1"
      />
      {/* Painel superior (reflexo) */}
      <polygon
        points="64,32 136,32 148,42 145,35 136,30 64,30 55,35 52,42"
        fill="#1e293b"
        opacity="0.7"
      />
      {/* Painéis laterais */}
      <polygon points="50,52 60,48 60,90 50,86" fill="#32343A" opacity="0.5" />
      <polygon points="150,52 140,48 140,90 150,86" fill="#32343A" opacity="0.5" />
      {/* Linha de detalhe no topo */}
      <line x1="62" y1="38" x2="138" y2="38" stroke="#3e6eb3" strokeWidth="0.8" opacity="0.7" />

      {/* ── Visor (tira neon horizontal) ────────────────────────────── */}
      {/* Moldura do visor */}
      <rect x="57" y="56" width="86" height="22" rx="4" fill="#060e1c" />
      <rect x="57" y="56" width="86" height="22" rx="4" stroke="#5086C6" strokeWidth="0.8" opacity="0.6" />
      {/* Faixa neon */}
      <rect
        x="59" y="58" width="82" height="18" rx="3"
        fill="url(#visorGrad)"
        filter="url(#visorGlow)"
      />
      {/* Reflexo no visor */}
      <rect x="62" y="59" width="28" height="5" rx="2.5" fill="white" opacity="0.22" />
      {/* Scan-lines */}
      <line x1="59" y1="64" x2="141" y2="64" stroke="white" strokeWidth="0.4" opacity="0.12" />
      <line x1="59" y1="70" x2="141" y2="70" stroke="white" strokeWidth="0.4" opacity="0.08" />

      {/* ── Detalhes da cabeça ───────────────────────────────────────── */}
      {/* Entradas de ar / ventilação (queixo) */}
      {[74, 84, 94, 104, 114].map((x, i) => (
        <rect key={i} x={x} y="92" width="5" height="8" rx="1" fill="#050d1a" />
      ))}
      <line x1="72" y1="96" x2="122" y2="96" stroke="#5086C6" strokeWidth="0.6" opacity="0.35" />

      {/* ── Pescoço ───────────────────────────────────────────────────── */}
      <polygon
        points="82,106 118,106 124,112 124,122 76,122 76,112"
        fill="#0f172a"
        stroke="#3e6eb3"
        strokeWidth="0.8"
      />
      {[88, 100, 112].map((x, i) => (
        <circle key={i} cx={x} cy="115" r="2" fill="#5086C6" opacity="0.8" filter="url(#softGlow)" />
      ))}

      {/* ── Corpo principal ──────────────────────────────────────────── */}
      {/* Sombra */}
      <polygon
        points="40,122 160,122 166,134 166,202 160,208 40,208 34,202 34,134"
        fill="#050d1a"
        transform="translate(2,3)"
        opacity="0.4"
      />
      {/* Corpo */}
      <polygon
        points="40,120 160,120 166,132 166,200 160,206 40,206 34,200 34,132"
        fill="url(#darkMetal)"
        stroke="#3e6eb3"
        strokeWidth="1"
      />
      {/* Ombros em destaque */}
      <polygon points="34,128 58,120 58,132 34,140" fill="#32343A" opacity="0.6" />
      <polygon points="166,128 142,120 142,132 166,140" fill="#32343A" opacity="0.6" />
      {/* Faixa superior do corpo */}
      <polygon
        points="40,120 160,120 165,129 160,124 40,124 35,129"
        fill="#32343A"
        opacity="0.55"
      />

      {/* ── Núcleo hexagonal de energia ─────────────────────────────── */}
      {/* Anel externo */}
      <polygon
        points="100,132 116,141 116,159 100,168 84,159 84,141"
        fill="#0a1020"
        stroke="#5086C6"
        strokeWidth="1.5"
      />
      {/* Glow interno */}
      <polygon
        points="100,136 113,143.5 113,156.5 100,164 87,156.5 87,143.5"
        fill="url(#coreGlow)"
        filter="url(#softGlow)"
      />
      {/* Núcleo central */}
      <circle cx="100" cy="150" r="6" fill="#e0f2fe" filter="url(#visorGlow)" />
      <circle cx="100" cy="150" r="10" fill="none" stroke="#5086C6" strokeWidth="1" opacity="0.5" filter="url(#softGlow)" />
      <circle cx="100" cy="150" r="14" fill="none" stroke="#3e6eb3" strokeWidth="0.5" opacity="0.4" />

      {/* ── Linhas de painel do corpo ────────────────────────────────── */}
      <line x1="60" y1="124" x2="82"  y2="124" stroke="#3e6eb3" strokeWidth="0.8" opacity="0.9" />
      <line x1="60" y1="124" x2="60"  y2="200" stroke="#3e6eb3" strokeWidth="0.8" opacity="0.5" />
      <line x1="140" y1="124" x2="118" y2="124" stroke="#3e6eb3" strokeWidth="0.8" opacity="0.9" />
      <line x1="140" y1="124" x2="140" y2="200" stroke="#3e6eb3" strokeWidth="0.8" opacity="0.5" />
      <line x1="40"  y1="175" x2="160" y2="175" stroke="#3e6eb3" strokeWidth="0.6" opacity="0.4" />
      {/* Pontos de circuito */}
      {[[65,186],[73,186],[127,186],[135,186]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="#3e6eb3" opacity="0.9" />
      ))}
      <line x1="65" y1="186" x2="73" y2="186" stroke="#3e6eb3" strokeWidth="0.8" opacity="0.7" />
      <line x1="127" y1="186" x2="135" y2="186" stroke="#3e6eb3" strokeWidth="0.8" opacity="0.7" />

      {/* ── BRAÇO ESQUERDO ───────────────────────────────────────────── */}
      {/* Peça de ombro */}
      <polygon
        points="6,120 36,120 42,128 42,150 36,156 6,156 2,150 2,128"
        fill="#32343A"
        stroke="#3e6eb3"
        strokeWidth="0.8"
      />
      <line x1="2"  y1="134" x2="42" y2="134" stroke="#5086C6" strokeWidth="0.8" opacity="0.5" />
      {/* Braço superior */}
      <polygon
        points="8,156 36,156 38,162 38,194 36,198 8,198 6,194 6,162"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      {/* Cotovelo */}
      <rect x="6" y="194" width="32" height="8" rx="3" fill="#32343A" stroke="#3e6eb3" strokeWidth="0.5" />
      {/* Antebraço */}
      <polygon
        points="8,202 36,202 34,234 10,234"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      <line x1="8" y1="212" x2="36" y2="212" stroke="#5086C6" strokeWidth="0.8" opacity="0.4" />
      {/* Sensor da mão */}
      <polygon points="6,234 38,234 36,242 8,242" fill="#32343A" stroke="#3e6eb3" strokeWidth="0.5" />
      <circle cx="22" cy="238" r="3.5" fill="#5086C6" filter="url(#softGlow)" />

      {/* ── BRAÇO DIREITO ────────────────────────────────────────────── */}
      {/* Peça de ombro */}
      <polygon
        points="194,120 164,120 158,128 158,150 164,156 194,156 198,150 198,128"
        fill="#32343A"
        stroke="#3e6eb3"
        strokeWidth="0.8"
      />
      <line x1="198" y1="134" x2="158" y2="134" stroke="#5086C6" strokeWidth="0.8" opacity="0.5" />
      {/* Braço superior */}
      <polygon
        points="192,156 164,156 162,162 162,194 164,198 192,198 194,194 194,162"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      {/* Cotovelo */}
      <rect x="162" y="194" width="32" height="8" rx="3" fill="#32343A" stroke="#3e6eb3" strokeWidth="0.5" />
      {/* Antebraço */}
      <polygon
        points="192,202 164,202 166,234 190,234"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      <line x1="192" y1="212" x2="164" y2="212" stroke="#5086C6" strokeWidth="0.8" opacity="0.4" />
      {/* Sensor da mão */}
      <polygon points="194,234 162,234 164,242 192,242" fill="#32343A" stroke="#3e6eb3" strokeWidth="0.5" />
      <circle cx="178" cy="238" r="3.5" fill="#5086C6" filter="url(#softGlow)" />

      {/* ── PERNAS ───────────────────────────────────────────────────── */}
      {/* Coxa esquerda */}
      <polygon
        points="48,206 92,206 94,212 94,244 92,248 48,248 46,244 46,212"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      {/* Joelho hexagonal esquerdo */}
      <polygon
        points="70,240 84,247 84,254 70,261 56,254 56,247"
        fill="#32343A"
        stroke="#5086C6"
        strokeWidth="1.2"
        filter="url(#softGlow)"
      />
      <polygon
        points="70,244 81,249.5 81,253 70,258.5 59,253 59,249.5"
        fill="#050d1a"
      />
      <circle cx="70" cy="251" r="3" fill="#5086C6" opacity="0.7" filter="url(#softGlow)" />

      {/* Canela esquerda */}
      <polygon
        points="50,261 90,261 88,278 52,278"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      <line x1="52" y1="268" x2="88" y2="268" stroke="#3e6eb3" strokeWidth="0.6" opacity="0.5" />
      {/* Bota esquerda */}
      <polygon points="44,278 96,278 100,284 40,284" fill="#32343A" stroke="#3e6eb3" strokeWidth="0.5" />
      <line x1="44" y1="281" x2="96" y2="281" stroke="#5086C6" strokeWidth="0.5" opacity="0.4" />

      {/* Coxa direita */}
      <polygon
        points="108,206 152,206 154,212 154,244 152,248 108,248 106,244 106,212"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      {/* Joelho hexagonal direito */}
      <polygon
        points="130,240 144,247 144,254 130,261 116,254 116,247"
        fill="#32343A"
        stroke="#5086C6"
        strokeWidth="1.2"
        filter="url(#softGlow)"
      />
      <polygon
        points="130,244 141,249.5 141,253 130,258.5 119,253 119,249.5"
        fill="#050d1a"
      />
      <circle cx="130" cy="251" r="3" fill="#5086C6" opacity="0.7" filter="url(#softGlow)" />

      {/* Canela direita */}
      <polygon
        points="110,261 150,261 148,278 112,278"
        fill="url(#darkMetal)"
        stroke="#32343A"
        strokeWidth="0.8"
      />
      <line x1="112" y1="268" x2="148" y2="268" stroke="#3e6eb3" strokeWidth="0.6" opacity="0.5" />
      {/* Bota direita */}
      <polygon points="104,278 156,278 160,284 100,284" fill="#32343A" stroke="#3e6eb3" strokeWidth="0.5" />
      <line x1="104" y1="281" x2="156" y2="281" stroke="#5086C6" strokeWidth="0.5" opacity="0.4" />
    </svg>
  )
}
