// Gerador de orçamento PDF profissional
// Usa window.print() com HTML estilizado — sem dependências externas

interface ModuloOrcamento {
  nome: string
  descricao?: string
  preco_mensal: number | null
  preco_setup: number | null
}

interface OrcamentoData {
  nomeFranquia: string
  codigoCp?: string
  responsavel?: string
  modulos: ModuloOrcamento[]
  subtotalMensal: number
  descontoMensal: number
  mensalidadeFinal: number
  subtotalSetup: number
  descontoSetup: number
  setupFinal: number
}

const brl = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const hoje = () => new Date().toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric'
})

const validade = () => {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function gerarOrcamentoPDF(dados: OrcamentoData) {
  const modulosRows = dados.modulos.map(m => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9">
        <div style="font-weight:600;color:#1e293b">${m.nome}</div>
        ${m.descricao ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px">${m.descricao}</div>` : ''}
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b">
        ${m.preco_mensal != null ? brl(m.preco_mensal) + '/mês' : 'Sob consulta'}
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b">
        ${m.preco_setup != null && m.preco_setup > 0
          ? `<strong style="color:#1e293b">${brl(m.preco_setup)}</strong>`
          : '<span style="color:#cbd5e1">—</span>'}
      </td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Orçamento AnK Data — ${dados.nomeFranquia}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; background:#f8fafc; color:#1e293b; }
    .page { max-width:800px; margin:0 auto; background:#fff; min-height:100vh; }

    /* Header */
    .header { background:linear-gradient(135deg,#1e2024 0%,#32343A 60%,#3d4047 100%); padding:48px; color:#fff; }
    .header-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
    .logo { font-size:28px; font-weight:800; letter-spacing:-0.5px; }
    .logo span { color:#5086C6; }
    .badge { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2);
      border-radius:100px; padding:4px 14px; font-size:12px; font-weight:500; }
    .header-title { font-size:13px; text-transform:uppercase; letter-spacing:2px; color:rgba(255,255,255,.5); margin-bottom:6px; }
    .header-client { font-size:26px; font-weight:700; margin-bottom:4px; }
    .header-sub { font-size:14px; color:rgba(255,255,255,.6); }
    .header-meta { display:flex; gap:32px; margin-top:24px; padding-top:24px; border-top:1px solid rgba(255,255,255,.1); }
    .meta-item label { display:block; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,.4); margin-bottom:3px; }
    .meta-item span { font-size:14px; font-weight:500; color:rgba(255,255,255,.85); }

    /* Pitch */
    .pitch { background:#5086C6; padding:24px 48px; }
    .pitch p { color:#fff; font-size:14px; line-height:1.7; }
    .pitch p strong { color:#dbeafe; }

    /* Conteúdo */
    .content { padding:40px 48px; }
    .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#94a3b8; margin-bottom:16px; }

    /* Tabela */
    table { width:100%; border-collapse:collapse; margin-bottom:8px; }
    thead tr { background:#f8fafc; }
    thead th { padding:10px 16px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase;
      letter-spacing:1px; color:#94a3b8; border-bottom:2px solid #e2e8f0; }
    thead th:not(:first-child) { text-align:right; }

    /* Resumo financeiro */
    .finance-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:24px; }
    .finance-card { border-radius:16px; padding:20px; }
    .finance-card.mensal { background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #bfdbfe; }
    .finance-card.setup  { background:linear-gradient(135deg,#f5f3ff,#ede9fe); border:1px solid #c4b5fd; }
    .finance-card label  { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#64748b; display:block; margin-bottom:8px; }
    .finance-card .valor { font-size:24px; font-weight:800; }
    .finance-card.mensal .valor { color:#1d4ed8; }
    .finance-card.setup  .valor { color:#6d28d9; }
    .finance-card .detalhe { font-size:11px; color:#94a3b8; margin-top:4px; }
    .finance-card .economia { font-size:12px; font-weight:600; color:#16a34a; margin-top:6px; }

    /* Benefícios */
    .benefits { margin-top:32px; background:#f8fafc; border-radius:16px; padding:24px; border:1px solid #e2e8f0; }
    .benefit { display:flex; gap:12px; margin-bottom:12px; }
    .benefit:last-child { margin-bottom:0; }
    .benefit-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
    .benefit-text strong { display:block; font-size:13px; font-weight:600; color:#1e293b; margin-bottom:2px; }
    .benefit-text span { font-size:12px; color:#64748b; }

    /* Rodapé */
    .footer { margin-top:40px; padding:24px 48px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }
    .footer-left { font-size:11px; color:#94a3b8; }
    .footer-left strong { display:block; color:#64748b; margin-bottom:2px; }
    .cta { background:#5086C6; color:#fff; padding:12px 24px; border-radius:12px; font-size:13px; font-weight:600; text-decoration:none; }

    @media print {
      body { background:#fff; }
      .page { max-width:none; }
      .no-print { display:none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div class="logo">An<span>K</span> Data</div>
      <div class="badge">Proposta Comercial</div>
    </div>
    <div class="header-title">Proposta personalizada para</div>
    <div class="header-client">${dados.nomeFranquia}</div>
    ${dados.codigoCp ? `<div class="header-sub">Código CP: ${dados.codigoCp}</div>` : ''}
    <div class="header-meta">
      <div class="meta-item">
        <label>Data da proposta</label>
        <span>${hoje()}</span>
      </div>
      <div class="meta-item">
        <label>Válida até</label>
        <span>${validade()}</span>
      </div>
      ${dados.responsavel ? `<div class="meta-item"><label>Responsável AnK</label><span>${dados.responsavel}</span></div>` : ''}
    </div>
  </div>

  <!-- Pitch comercial -->
  <div class="pitch">
    <p>
      A <strong>AnK Data</strong> transforma os dados da sua rede em decisões estratégicas.
      Com inteligência artificial aplicada ao varejo do Grupo Boticário, você terá
      <strong>visibilidade total das vendas, estoque e performance</strong> da sua franquia —
      em tempo real, de qualquer lugar. A proposta abaixo foi elaborada especialmente para
      sua realidade e perfil de negócio.
    </p>
  </div>

  <!-- Módulos -->
  <div class="content">
    <div class="section-title">Módulos contratados</div>
    <table>
      <thead>
        <tr>
          <th>Módulo</th>
          <th style="text-align:right">Mensalidade</th>
          <th style="text-align:right">Setup (único)</th>
        </tr>
      </thead>
      <tbody>
        ${modulosRows}
        <tr style="background:#f8fafc">
          <td style="padding:12px 16px;font-weight:700;color:#475569">Subtotal</td>
          <td style="padding:12px 16px;text-align:right;font-weight:700;color:#475569">${brl(dados.subtotalMensal)}/mês</td>
          <td style="padding:12px 16px;text-align:right;font-weight:700;color:#475569">${dados.subtotalSetup > 0 ? brl(dados.subtotalSetup) : '<span style="color:#cbd5e1">—</span>'}</td>
        </tr>
        ${dados.descontoMensal > 0 || dados.descontoSetup > 0 ? `
        <tr style="background:#f0fdf4">
          <td style="padding:10px 16px;color:#15803d;font-weight:600;font-size:13px">🎁 Desconto comercial especial</td>
          <td style="padding:10px 16px;text-align:right;color:#15803d;font-weight:700">${dados.descontoMensal > 0 ? `− ${brl(dados.descontoMensal)}/mês` : '—'}</td>
          <td style="padding:10px 16px;text-align:right;color:#15803d;font-weight:700">${dados.descontoSetup > 0 ? `− ${brl(dados.descontoSetup)}` : '—'}</td>
        </tr>` : ''}
        <tr style="background:#1e293b">
          <td style="padding:14px 16px;font-weight:800;color:#fff;font-size:14px">TOTAL</td>
          <td style="padding:14px 16px;text-align:right;font-weight:800;color:#fff;font-size:15px">${brl(dados.mensalidadeFinal)}<span style="font-size:12px;font-weight:400;color:#94a3b8">/mês</span></td>
          <td style="padding:14px 16px;text-align:right;font-weight:800;color:#fff;font-size:15px">${dados.setupFinal > 0 ? brl(dados.setupFinal) : '<span style="font-size:12px;font-weight:400;color:#94a3b8">—</span>'}</td>
        </tr>
      </tbody>
    </table>

    <!-- Resumo financeiro -->
    <div class="finance-grid">
      <div class="finance-card mensal">
        <label>💰 Investimento mensal</label>
        <div class="valor">${brl(dados.mensalidadeFinal)}<span style="font-size:14px;font-weight:400;color:#93c5fd">/mês</span></div>
        ${dados.descontoMensal > 0 ? `<div class="economia">✓ Você economiza ${brl(dados.descontoMensal)}/mês</div>` : ''}
        <div class="detalhe">Recorrente · Faturamento mensal</div>
      </div>
      ${dados.setupFinal > 0 ? `
      <div class="finance-card setup">
        <label>⚡ Investimento inicial (setup)</label>
        <div class="valor">${brl(dados.setupFinal)}</div>
        ${dados.descontoSetup > 0 ? `<div class="economia">✓ Você economiza ${brl(dados.descontoSetup)} no setup</div>` : ''}
        <div class="detalhe">Cobrado uma única vez · Implantação e configuração</div>
      </div>` : ''}
    </div>

    <!-- O que está incluído -->
    <div class="benefits">
      <div class="section-title" style="margin-bottom:20px">O que está incluído</div>
      <div class="benefit">
        <div class="benefit-icon">📊</div>
        <div class="benefit-text">
          <strong>Dashboards em tempo real</strong>
          <span>Acompanhe Sell-Out, giro de estoque e performance por vendedor em qualquer dispositivo.</span>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">🤖</div>
        <div class="benefit-text">
          <strong>Inteligência Artificial aplicada ao varejo</strong>
          <span>Alertas automáticos, previsões de estoque e identificação de oportunidades de crescimento.</span>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">🔒</div>
        <div class="benefit-text">
          <strong>Segurança e conformidade LGPD</strong>
          <span>Dados criptografados, controle de acesso por perfil e auditoria completa de acessos.</span>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">🚀</div>
        <div class="benefit-text">
          <strong>Implantação assistida pela equipe AnK Data</strong>
          <span>Treinamento, configuração do ambiente e suporte dedicado durante todo o onboarding.</span>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">📱</div>
        <div class="benefit-text">
          <strong>Acesso multicanal</strong>
          <span>Plataforma web responsiva acessível de qualquer dispositivo, sem instalar aplicativo.</span>
        </div>
      </div>
    </div>

    <!-- Nota de validade -->
    <div style="margin-top:20px;padding:14px 20px;background:#fefce8;border:1px solid #fde68a;border-radius:12px;">
      <p style="font-size:12px;color:#92400e;">
        ⏳ <strong>Esta proposta é válida até ${validade()}.</strong>
        Os valores acima são exclusivos para esta negociação e podem ser revisados após essa data.
        Para mais informações, entre em contato com seu consultor AnK Data.
      </p>
    </div>
  </div>

  <!-- Rodapé -->
  <div class="footer">
    <div class="footer-left">
      <strong>AnK Data — João Paulo de Sousa Tabosa</strong>
      CNPJ 50.238.359/0001-70 · Campo Grande/MS · ti@ankdata.com.br
    </div>
    <div class="no-print" style="display:flex;gap:10px">
      <button onclick="window.print()" class="cta">🖨️ Imprimir / Salvar PDF</button>
      <a id="dl-link" class="cta" style="background:#475569;text-decoration:none">⬇️ Baixar HTML</a>
    </div>
    <script>
      // Configura o link de download
      const dlLink = document.getElementById('dl-link')
      const blob = new Blob([document.documentElement.outerHTML], {type:'text/html'})
      dlLink.href = URL.createObjectURL(blob)
      dlLink.download = 'Orcamento_AnK_Data.html'
    </script>
  </div>

</div>
</body>
</html>`

  // Usa Blob URL — funciona em todos os browsers, inclusive VSCode
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  if (!win) {
    // Fallback: download direto como HTML
    const a = document.createElement('a')
    a.href = url
    a.download = `Orcamento_AnK_Data_${dados.nomeFranquia.replace(/\s+/g, '_')}.html`
    a.click()
  }
  // Libera memória após 60 segundos
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
