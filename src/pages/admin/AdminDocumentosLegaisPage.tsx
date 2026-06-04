import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DocumentTextIcon, ClipboardDocumentIcon, CheckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'

// ─── Dados da empresa ─────────────────────────────────────────────────────────

const E = {
  razaoSocial: 'João Paulo de Sousa Tabosa',
  nomeFantasia: 'AnK Data',
  cnpj: '50.238.359/0001-70',
  cidade: 'Campo Grande',
  estado: 'MS',
  dpo: 'João Paulo de Sousa Tabosa',
  emailDpo: 'ti@ankdata.com.br',
  dataAtual: new Date().toLocaleDateString('pt-BR'),
}

// ─── Textos dos documentos ────────────────────────────────────────────────────

const DPA_TEXTO = `ADENDO DE PROTEÇÃO DE DADOS (DPA)
Versão 1.0 — ${E.dataAtual}

PARTES:
OPERADOR: ${E.razaoSocial}, inscrita sob o CNPJ ${E.cnpj}, com sede em ${E.cidade}/${E.estado}, denominada "AnK Data", que desenvolve e opera a plataforma AnK Data Insights.

CONTROLADOR: A empresa franqueada contratante, inscrita sob o CNPJ informado no contrato de prestação de serviços, denominada "Franqueada".

1. OBJETO
O presente Adendo estabelece as condições de tratamento de dados pessoais pela AnK Data (Operador) em nome da Franqueada (Controlador), em conformidade com a Lei 13.709/2018 (LGPD) e o Regulamento Geral de Proteção de Dados (GDPR), quando aplicável.

2. DADOS TRATADOS PELO OPERADOR
O Operador tratará, em nome do Controlador, os seguintes dados pessoais:
- Nome completo dos colaboradores da Franqueada
- CPF dos colaboradores
- Cargo e função
- Login Ingresse (identificador de acesso)
- Data e hora de último acesso à plataforma
- Configurações de perfil de acesso

3. FINALIDADE DO TRATAMENTO
Os dados serão tratados exclusivamente para:
a) Provimento de acesso à plataforma AnK Data Insights
b) Controle de permissões por módulo e unidade de loja
c) Segurança e auditoria de acessos
d) Comunicações operacionais da plataforma

4. OBRIGAÇÕES DO OPERADOR (AnK Data)
4.1 Tratar os dados pessoais apenas conforme instruções documentadas do Controlador.
4.2 Garantir que pessoas autorizadas a tratar os dados se comprometam com a confidencialidade.
4.3 Adotar medidas técnicas e organizacionais adequadas de segurança, incluindo:
    - Criptografia em trânsito (TLS/HTTPS)
    - Criptografia em repouso (Supabase AES-256)
    - Controle de acesso baseado em perfil (RBAC)
    - Row Level Security (RLS) no banco de dados
    - URLs temporárias com expiração para documentos sensíveis
    - Rate limiting de autenticação
4.4 Notificar o Controlador em até 72 horas em caso de incidente de segurança.
4.5 Auxiliar o Controlador no atendimento a solicitações dos titulares de dados.
4.6 Excluir ou devolver todos os dados pessoais ao Controlador ao término do contrato.

5. OBRIGAÇÕES DO CONTROLADOR (Franqueada)
5.1 Garantir que possui base legal para o tratamento dos dados.
5.2 Obter consentimento adequado dos colaboradores ou demonstrar outra base legal.
5.3 Informar os titulares sobre o tratamento de seus dados.
5.4 Emitir instruções lícitas ao Operador.

6. SUBOPERADORES
O Operador utiliza os seguintes suboperadores:
- Supabase Inc. (EUA): banco de dados, autenticação e armazenamento de arquivos.
  Certificações: SOC 2 Type II. Dados protegidos por Cláusulas Contratuais Padrão (SCCs).
- Vercel Inc. (EUA): hospedagem da aplicação.

7. TRANSFERÊNCIA INTERNACIONAL
Os dados são armazenados nos servidores da Supabase nos Estados Unidos. Esta transferência é amparada por Cláusulas Contratuais Padrão (SCCs) em conformidade com o Art. 33 da LGPD.

8. RETENÇÃO
Os dados serão retidos pelo Operador pelo período necessário à execução do contrato e, após seu término, por até 5 (cinco) anos para cumprimento de obrigações legais, conforme Art. 7º, II e VI da LGPD.

9. VIGÊNCIA
Este Adendo entra em vigor na data de assinatura do Contrato de Prestação de Serviços entre as partes e permanece vigente enquanto o contrato estiver em vigor.

Campo Grande/MS, ${E.dataAtual}

_________________________________
${E.razaoSocial}
CNPJ: ${E.cnpj}
AnK Data — Operador

_________________________________
CONTRATANTE/CONTROLADOR
CNPJ: ___________________`

const DPO_TEXTO = `TERMO DE DESIGNAÇÃO DE ENCARREGADO DE DADOS PESSOAIS (DPO)
Artigo 41 da Lei 13.709/2018 — LGPD

${E.razaoSocial.toUpperCase()}, pessoa física, inscrita no CPF sob o nº __.___.___-__, exercendo a atividade empresarial sob o nome fantasia "AnK Data", CNPJ ${E.cnpj}, com sede na cidade de ${E.cidade}, estado de ${E.estado}, doravante denominada EMPRESA,

DESIGNA, na forma do Art. 41 da Lei Geral de Proteção de Dados (Lei 13.709/2018):

ENCARREGADO DE PROTEÇÃO DE DADOS (DPO):
Nome completo: ${E.dpo}
E-mail de contato: ${E.emailDpo}
Localidade: ${E.cidade}/${E.estado}

ATRIBUIÇÕES DO ENCARREGADO:
I.   Aceitar reclamações e comunicações dos titulares de dados pessoais.
II.  Prestar esclarecimentos e adotar providências.
III. Receber comunicações da Autoridade Nacional de Proteção de Dados (ANPD).
IV.  Orientar os colaboradores e contratados sobre práticas de proteção de dados.
V.   Executar as demais atribuições determinadas pela empresa ou estabelecidas em normas complementares.
VI.  Atender às solicitações dos titulares de dados no prazo de até 15 (quinze) dias úteis.
VII. Notificar a ANPD e os titulares afetados em caso de incidente de segurança relevante.

CANAL DE ATENDIMENTO AOS TITULARES:
E-mail: ${E.emailDpo}
Prazo de resposta: até 15 dias úteis

Este termo entra em vigor na data de sua assinatura, podendo ser revogado a qualquer momento mediante novo ato formal.

Campo Grande/MS, ${E.dataAtual}

_________________________________
${E.razaoSocial}
CNPJ: ${E.cnpj}
AnK Data

_________________________________
${E.dpo}
Encarregado de Proteção de Dados (DPO)`

// ─── Componente de documento ──────────────────────────────────────────────────

function DocCard({ titulo, subtitulo, texto, cor }: {
  titulo: string; subtitulo: string; texto: string; cor: string
}) {
  const [copied, setCopied] = useState(false)

  function copiar() {
    navigator.clipboard.writeText(texto)
    setCopied(true)
    toast.success('Texto copiado!')
    setTimeout(() => setCopied(false), 2500)
  }

  function baixar() {
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${titulo.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Documento baixado!')
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-start justify-between gap-4 ${cor}`}>
        <div className="flex items-start gap-3">
          <DocumentTextIcon className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">{titulo}</p>
            <p className="text-xs opacity-75 mt-0.5">{subtitulo}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={copiar}
            className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-medium transition-colors">
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button onClick={baixar}
            className="rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-medium transition-colors">
            ↓ Baixar .txt
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <pre className="px-6 py-5 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
        {texto}
      </pre>
    </div>
  )
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AceiteRecord {
  id: string
  nome: string
  papel: string
  lgpd_aceito_em: string
  lgpd_versao: string | null
  tenant_id: string | null
  tenant?: { nome_franquia: string } | null
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AdminDocumentosLegaisPage() {
  const [aceites, setAceites]           = useState<AceiteRecord[]>([])
  const [pendentes, setPendentes]       = useState<AceiteRecord[]>([])
  const [loadingAceites, setLoadingAceites] = useState(true)

  useEffect(() => {
    async function fetchAceites() {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, papel, lgpd_aceito_em, lgpd_versao, tenant_id, tenant:tenants(nome_franquia)')
        .not('papel', 'like', 'ank_%')
        .order('lgpd_aceito_em', { ascending: false, nullsFirst: false })
        .limit(200)

      const todos = (data ?? []) as unknown as AceiteRecord[]
      setAceites(todos.filter(p => p.lgpd_aceito_em))
      setPendentes(todos.filter(p => !p.lgpd_aceito_em))
      setLoadingAceites(false)
    }
    fetchAceites()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
          <DocumentTextIcon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Documentos Legais</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            LGPD — Política de Privacidade, DPA e Designação do DPO da AnK Data
          </p>
        </div>
      </div>

      {/* Aviso */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 text-sm text-amber-800 dark:text-amber-400">
        <p className="font-semibold mb-1">⚠️ Atenção</p>
        <p>
          Estes documentos foram gerados automaticamente com base nos dados cadastrados.
          Recomendamos que um advogado especializado em LGPD revise antes do uso formal.
          A AnK Data não se responsabiliza pelo uso inadequado destes templates.
        </p>
      </div>

      {/* Empresa */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Dados da empresa</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            ['Razão Social', E.razaoSocial],
            ['Nome Fantasia', E.nomeFantasia],
            ['CNPJ', E.cnpj],
            ['Sede', `${E.cidade}/${E.estado}`],
            ['DPO', E.dpo],
            ['E-mail DPO', E.emailDpo],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-slate-400 dark:text-slate-500 text-xs">{k}:</span>
              <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Política de Privacidade — link */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-blue-800 dark:text-blue-400 text-sm">📄 Política de Privacidade</p>
          <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">Publicada em <strong>/privacidade</strong> — acessível por qualquer usuário</p>
        </div>
        <a href="/privacidade" target="_blank"
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold transition-colors">
          Abrir ↗
        </a>
      </div>

      {/* DPA */}
      <DocCard
        titulo="Adendo de Proteção de Dados (DPA)"
        subtitulo="Incluir em todos os contratos com franqueados — Versão 1.0"
        texto={DPA_TEXTO}
        cor="bg-violet-600 text-white"
      />

      {/* Designação DPO */}
      <DocCard
        titulo="Termo de Designação do DPO"
        subtitulo="Documento interno — arquivar assinado fisicamente ou com assinatura digital"
        texto={DPO_TEXTO}
        cor="bg-emerald-600 text-white"
      />

      {/* ── Registro de Aceites ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Registro de Aceites LGPD</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {aceites.length} aceite{aceites.length !== 1 ? 's' : ''} registrado{aceites.length !== 1 ? 's' : ''}
                {pendentes.length > 0 && ` · ${pendentes.length} pendente${pendentes.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {loadingAceites ? (
          <p className="px-6 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">Carregando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">Data do Aceite</th>
                  <th className="px-5 py-3">Versão</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {aceites.length === 0 && pendentes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                      Nenhum usuário de franquia cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  <>
                    {aceites.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{u.nome}</td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {(u.tenant as { nome_franquia: string } | null)?.nome_franquia ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{u.papel}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                          {format(parseISO(u.lgpd_aceito_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                          v{u.lgpd_versao ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold
                            bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400
                            ring-1 ring-emerald-200 dark:ring-emerald-700">
                            ✓ Aceito
                          </span>
                        </td>
                      </tr>
                    ))}
                    {pendentes.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors opacity-60">
                        <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300">{u.nome}</td>
                        <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs">
                          {(u.tenant as { nome_franquia: string } | null)?.nome_franquia ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs">{u.papel}</td>
                        <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs italic">—</td>
                        <td className="px-5 py-3 text-xs text-slate-400 dark:text-slate-500">—</td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold
                            bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400
                            ring-1 ring-amber-200 dark:ring-amber-700">
                            ⏳ Pendente
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Próximos passos */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <p className="font-semibold text-slate-900 dark:text-slate-100 mb-4">✅ Checklist LGPD</p>
        <div className="space-y-2">
          {[
            { ok: true,  texto: 'Política de Privacidade publicada em /privacidade' },
            { ok: true,  texto: 'Aceite de termos no Primeiro Acesso com registro de data e versão' },
            { ok: true,  texto: 'DPA redigido para inclusão nos contratos com franqueados' },
            { ok: true,  texto: 'DPO formalmente designado por documento' },
            { ok: true,  texto: 'Dados pessoais protegidos por RLS, RBAC e criptografia' },
            { ok: true,  texto: 'Rate limiting configurado no Supabase Auth' },
            { ok: true,  texto: 'URLs temporárias para arquivos sensíveis (signed URLs)' },
            { ok: false, texto: 'Assinar o Termo de Designação do DPO fisicamente ou com assinatura digital' },
            { ok: false, texto: 'Enviar DPA para cada franqueado assinar junto ao contrato' },
            { ok: false, texto: 'Criar e-mail dedicado: privacidade@ankdata.com.br (alias do ti@ankdata.com.br)' },
            { ok: false, texto: 'Registrar na ANPD — gov.br/anpd (recomendável, não obrigatório para ME)' },
            { ok: false, texto: 'Revisão jurídica dos documentos por advogado especializado em LGPD' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`shrink-0 mt-0.5 ${item.ok ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                {item.ok ? '✅' : '⬜'}
              </span>
              <p className={`text-sm ${item.ok ? 'text-slate-600 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                {item.texto}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
