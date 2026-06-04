import { useState, useEffect, type FormEvent } from 'react'
import { UserPlusIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { gerarOrcamentoPDF } from './gerarOrcamento'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import type { Cliente, Situacao, Score } from './ClientesListPage'
import { SCORE_CONFIG, SITUACAO_CONFIG } from './ClientesListPage'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PlanoCatalogo {
  id: string
  nome: string
  preco_mensal: number | null
  preco_setup: number | null
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, desc }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string
}) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-colors
      ${checked ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
          ${checked ? 'bg-ank-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export default function ClienteModal({ open, initial, onClose, onSaved }: {
  open: boolean
  initial: Cliente | null
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !initial

  // Dados da franquia
  const [nomeFranquia, setNomeFranquia] = useState('')
  const [codigoCp,     setCodigoCp]     = useState('')
  const [driveId,      setDriveId]      = useState('')
  const [situacao,     setSituacao]     = useState<Situacao>('trial')
  const [score,        setScore]        = useState<Score>('normal')
  const [implantacao,  setImplantacao]  = useState(0)
  const [responsavel,  setResponsavel]  = useState('')
  const [obs,          setObs]          = useState('')

  // Módulos selecionados + descontos
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([])
  const [desconto,            setDesconto]            = useState('')
  const [descontoSetup,       setDescontoSetup]       = useState('')

  // Usuário base
  const [criarUsuario, setCriarUsuario] = useState(false)
  const [nomeAdmin,    setNomeAdmin]    = useState('')
  const [emailAdmin,   setEmailAdmin]   = useState('')
  const [senhaAdmin,   setSenhaAdmin]   = useState('')
  const [ingresseId,   setIngresseId]   = useState('')

  // Dados auxiliares
  const [modulos, setModulos] = useState<PlanoCatalogo[]>([])
  const [tab,     setTab]     = useState<'franquia' | 'comercial' | 'usuario'>('franquia')
  const [saving,  setSaving]  = useState(false)

  // Carrega módulos do catálogo
  useEffect(() => {
    supabase.from('planos_catalogo').select('id, nome, preco_mensal, preco_setup')
      .eq('ativo', true).order('preco_mensal', { ascending: true, nullsFirst: false })
      .then(({ data }) => setModulos((data ?? []) as PlanoCatalogo[]))
  }, [])

  // Inicializa formulário
  useEffect(() => {
    if (open) {
      setNomeFranquia(initial?.nome_franquia ?? '')
      setCodigoCp(initial?.codigo_cp ?? '')
      setDriveId((initial as Cliente & { google_drive_folder_id?: string })?.google_drive_folder_id ?? '')
      setModulosSelecionados(initial?.modulos_ids ?? [])
      const initDesconto = initial?.desconto ?? 0
      setDesconto(initDesconto > 0 ? String(initDesconto) : '')
      const initDescontoSetup = initial?.desconto_setup ?? 0
      setDescontoSetup(initDescontoSetup > 0 ? String(initDescontoSetup) : '')
      setSituacao(initial?.situacao ?? 'trial')
      setScore(initial?.score ?? 'normal')
      setImplantacao(initial?.implantacao ?? 0)
      setResponsavel(initial?.responsavel ?? '')
      setObs(initial?.obs ?? '')
      setCriarUsuario(false); setNomeAdmin(''); setEmailAdmin(''); setSenhaAdmin(''); setIngresseId('')
      setTab('franquia')
    }
  }, [open, initial])

  // Cálculo mensal
  const subtotalModulos = modulos
    .filter(m => modulosSelecionados.includes(m.id) && m.preco_mensal)
    .reduce((s, m) => s + (m.preco_mensal ?? 0), 0)
  const descontoNum = parseFloat(desconto) || 0
  const mrrFinal    = Math.max(0, subtotalModulos - descontoNum)

  // Cálculo setup (único)
  const subtotalSetup = modulos
    .filter(m => modulosSelecionados.includes(m.id) && m.preco_setup)
    .reduce((s, m) => s + (m.preco_setup ?? 0), 0)
  const descontoSetupNum = parseFloat(descontoSetup) || 0
  const setupFinal       = Math.max(0, subtotalSetup - descontoSetupNum)

  function toggleModulo(id: string) {
    setModulosSelecionados(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nomeFranquia.trim()) { toast.error('Nome da franquia obrigatório.'); return }
    if (criarUsuario && isNew) {
      if (!emailAdmin.trim()) { toast.error('E-mail do admin obrigatório.'); return }
      if (senhaAdmin.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres.'); return }
    }
    setSaving(true)
    try {
      const nomeModulos = modulos
        .filter(m => modulosSelecionados.includes(m.id))
        .map(m => m.nome).join(' + ') || null

      const payload: Record<string, unknown> = {
        nome_franquia:          nomeFranquia.trim(),
        codigo_cp:              codigoCp.trim() || null,
        google_drive_folder_id: driveId.trim() || null,
        plano:                  nomeModulos,
        mrr:                    mrrFinal || null,
        desconto:               descontoNum || 0,
        setup_total:            setupFinal || null,
        desconto_setup:         descontoSetupNum || 0,
        modulos_ids:            modulosSelecionados,
        kanban_stage:           isNew ? 'captacao' : undefined,
        situacao,
        score,
        implantacao,
        responsavel:            responsavel.trim() || null,
        obs:                    obs.trim() || null,
        ativo:                  true,
      }

      let tenantId: string

      if (initial) {
        // Edição
        const { error } = await supabase.from('tenants').update(payload).eq('id', initial.id)
        if (error) throw error
        tenantId = initial.id
        toast.success('Franquia atualizada.')
      } else {
        // Criação
        const { data, error } = await supabase.from('tenants').insert(payload).select().single()
        if (error) throw error
        tenantId = data.id
      }

      // Cria usuário admin base se solicitado
      if (criarUsuario && isNew && emailAdmin.trim()) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email:    emailAdmin.trim(),
          password: senhaAdmin,
          options:  { data: { full_name: nomeAdmin.trim() || nomeFranquia.trim() } },
        })
        if (authErr) throw authErr

        if (authData.user) {
          await new Promise(r => setTimeout(r, 800))
          await supabase.from('profiles').update({
            nome:        nomeAdmin.trim() || nomeFranquia.trim(),
            papel:       'franqueado',
            tenant_id:   tenantId,
            ingresse_id: ingresseId.trim() || null,
            email_admin: emailAdmin.trim(),
          }).eq('id', authData.user.id)
        }

        toast.success(`Franquia criada e usuário admin convidado para ${emailAdmin}.`)
      } else if (!criarUsuario && isNew) {
        toast.success('Franquia criada com sucesso.')
      }

      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  const TABS = [
    { id: 'franquia',  label: '🏢 Franquia'   },
    { id: 'comercial', label: '💰 Comercial'  },
    { id: 'usuario',   label: '👤 Usuário Base' },
  ] as const

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={isNew ? '🏢 Nova Franquia / Cliente' : `Editar — ${initial?.nome_franquia}`}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <div className="flex gap-2">
            {tab === 'comercial' && modulosSelecionados.length > 0 && (
              <button type="button"
                onClick={() => gerarOrcamentoPDF({
                  nomeFranquia:     nomeFranquia || 'Cliente',
                  codigoCp:         codigoCp || undefined,
                  responsavel:      responsavel || undefined,
                  modulos:          modulos.filter(m => modulosSelecionados.includes(m.id)).map(m => ({
                    nome: m.nome, preco_mensal: m.preco_mensal, preco_setup: m.preco_setup,
                  })),
                  subtotalMensal:   subtotalModulos,
                  descontoMensal:   descontoNum,
                  mensalidadeFinal: mrrFinal,
                  subtotalSetup,
                  descontoSetup:    descontoSetupNum,
                  setupFinal,
                })}
                className="flex items-center gap-2 rounded-xl border border-violet-300 dark:border-violet-700
                  bg-violet-50 dark:bg-violet-950/30 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-400
                  hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors">
                <DocumentArrowDownIcon className="h-4 w-4" />
                Gerar Orçamento PDF
              </button>
            )}
            <Button form="cliente-hub-form" type="submit" loading={saving}>
              {isNew ? (criarUsuario ? 'Criar Franquia + Usuário' : 'Criar Franquia') : 'Salvar'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5 -mt-1">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id
                ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form id="cliente-hub-form" onSubmit={handleSubmit} className="space-y-5">

        {/* ── ABA FRANQUIA ───────────────────────────────────────── */}
        {tab === 'franquia' && (
          <>
            <Input label="Nome da Franquia *" value={nomeFranquia}
              onChange={e => setNomeFranquia(e.target.value)} required
              placeholder="Ex: Boticário – CP Manoel" />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Código CP"
                value={codigoCp} onChange={e => setCodigoCp(e.target.value)}
                placeholder="Ex: 851424" hint="Código do PDV no sistema Boticário." />
              <Input label="Responsável AnK"
                value={responsavel} onChange={e => setResponsavel(e.target.value)}
                placeholder="Account Manager" />
            </div>

            <Input label="Google Drive Folder ID"
              value={driveId} onChange={e => setDriveId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
              hint="ID da pasta onde os arquivos de venda são depositados." />

            {/* Módulos contratados — multi-select */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Módulos Contratados
                  {modulosSelecionados.length > 0 && (
                    <span className="ml-2 inline-flex rounded-full bg-ank-100 dark:bg-ank-900/40 px-2 py-0.5
                      text-[10px] font-semibold text-ank-700 dark:text-ank-400">
                      {modulosSelecionados.length} selecionado{modulosSelecionados.length > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                {modulosSelecionados.length > 0 && (
                  <button type="button" onClick={() => setModulosSelecionados([])}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                    Limpar
                  </button>
                )}
              </div>
              {modulos.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                  Nenhum módulo cadastrado. Cadastre em <strong>Módulos</strong> primeiro.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {modulos.map(m => (
                    <label key={m.id}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors
                        ${modulosSelecionados.includes(m.id)
                          ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={modulosSelecionados.includes(m.id)}
                        onChange={() => toggleModulo(m.id)}
                        className="mt-0.5 h-4 w-4 accent-ank-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.nome}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {m.preco_mensal != null
                            ? `R$ ${m.preco_mensal.toLocaleString('pt-BR')}/mês`
                            : 'Sob consulta'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {modulosSelecionados.length > 0 && subtotalModulos > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                  Subtotal: <strong>R$ {subtotalModulos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</strong>
                  {' '}— veja o resumo na aba Comercial
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
                placeholder="Notas internas, contexto da negociação..."
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                  text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm resize-none" />
            </div>
          </>
        )}

        {/* ── ABA COMERCIAL ───────────────────────────────────────── */}
        {tab === 'comercial' && (
          <>
            {/* Breakdown de módulos */}
            {modulosSelecionados.length > 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Módulos contratados
                  </p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {modulos.filter(m => modulosSelecionados.includes(m.id)).map(m => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{m.nome}</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {m.preco_mensal != null
                          ? `R$ ${m.preco_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'Sob consulta'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subtotal</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      R$ {subtotalModulos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Nenhum módulo selecionado. Volte à aba Franquia e selecione os módulos.
              </div>
            )}

            {/* Mensalidade + desconto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Desconto Mensal (R$)
                  <span className="ml-1 text-xs font-normal text-slate-400">opcional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input type="number" min={0} step="0.01" value={desconto}
                    onChange={e => setDesconto(e.target.value)} placeholder="0,00"
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                      text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Desconto Setup (R$)
                  <span className="ml-1 text-xs font-normal text-slate-400">opcional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input type="number" min={0} step="0.01" value={descontoSetup}
                    onChange={e => setDescontoSetup(e.target.value)} placeholder="0,00"
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                      text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm" />
                </div>
              </div>
            </div>

            {/* Resumo financeiro */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border-2 p-4 ${descontoNum > 0 ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : 'border-ank-200 dark:border-ank-800 bg-ank-50 dark:bg-ank-950/30'}`}>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Mensalidade Final</p>
                <p className={`text-xl font-black ${descontoNum > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-ank-700 dark:text-ank-400'}`}>
                  R$ {mrrFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                </p>
                {descontoNum > 0 && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    R$ {subtotalModulos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} − R$ {descontoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} desc.
                  </p>
                )}
              </div>
              {subtotalSetup > 0 && (
                <div className={`rounded-xl border-2 p-4 ${descontoSetupNum > 0 ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Setup (único)</p>
                  <p className={`text-xl font-black ${descontoSetupNum > 0 ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    R$ {setupFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {descontoSetupNum > 0 && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      R$ {subtotalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} − R$ {descontoSetupNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} desc.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Situação + Score + Implantação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Situação</label>
                <select value={situacao} onChange={e => setSituacao(e.target.value as Situacao)}
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                    text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                  {Object.entries(SITUACAO_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Score de Saúde</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(Object.entries(SCORE_CONFIG) as [Score, typeof SCORE_CONFIG[Score]][]).map(([s, cfg]) => (
                    <button key={s} type="button" onClick={() => setScore(s)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border-2 transition-colors
                        ${score === s ? `ring-1 ring-inset ${cfg.badge} border-current` : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">Implantação</span>
                <span className="font-bold text-ank-600 dark:text-ank-400">{implantacao}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={implantacao}
                onChange={e => setImplantacao(Number(e.target.value))}
                className="w-full accent-ank-600" />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0% — Início</span><span>50% — Em andamento</span><span>100% — Concluída</span>
              </div>
            </div>
          </>
        )}

        {/* ── ABA USUÁRIO BASE ────────────────────────────────────── */}
        {tab === 'usuario' && (
          <>
            {!isNew ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                ℹ️ Para editar ou adicionar usuários desta franquia, acesse{' '}
                <strong>Clientes → Usuários das Empresas</strong>.
              </div>
            ) : (
              <>
                <Toggle
                  checked={criarUsuario}
                  onChange={setCriarUsuario}
                  label="Criar usuário administrador"
                  desc="Cria a conta do admin master desta franquia e envia convite por e-mail."
                />

                {criarUsuario && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <UserPlusIcon className="h-4 w-4" />
                      Admin Master da Franquia
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Input label="E-mail do admin *" type="email" value={emailAdmin}
                          onChange={e => setEmailAdmin(e.target.value)} required={criarUsuario}
                          placeholder="dono@empresa.com.br"
                          hint="Vai virar o admin master desta franquia." />
                      </div>
                      <Input label="Nome completo" value={nomeAdmin}
                        onChange={e => setNomeAdmin(e.target.value)}
                        placeholder={nomeFranquia || 'Nome do responsável'} />
                      <Input label="Senha temporária *" type="password" value={senhaAdmin}
                        onChange={e => setSenhaAdmin(e.target.value)} required={criarUsuario}
                        hint="Mín. 8 caracteres." />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Usuário Ingresse <span className="text-xs text-slate-400 font-normal">(login no sistema)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🎫</span>
                        <input type="text" value={ingresseId} onChange={e => setIngresseId(e.target.value)}
                          placeholder="ING-12345 ou username"
                          className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                            bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm
                            focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 text-[10px] text-blue-700 dark:text-blue-400">
                      📧 Um e-mail de confirmação será enviado automaticamente para o admin definir sua senha de acesso.
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </form>
    </Modal>
  )
}
