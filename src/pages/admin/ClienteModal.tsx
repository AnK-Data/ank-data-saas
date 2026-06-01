import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import type { Cliente, Situacao, Score } from './ClientesListPage'
import { SCORE_CONFIG, SITUACAO_CONFIG } from './ClientesListPage'

// ─── Origens de entrada ───────────────────────────────────────────────────────

const ORIGENS = [
  'Indicação de cliente',
  'Indicação de parceiro',
  'Prospecção ativa',
  'Inbound / Site',
  'Evento / Feira',
  'Redes sociais',
  'Grupo Boticário',
  'Outro',
]

const PLANOS_OPTS = ['Starter', 'Essencial', 'Pro', 'Enterprise']

// ─── Toggle reutilizável ──────────────────────────────────────────────────────

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

// ─── Seção de formulário ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-0.5">
        {title}
      </p>
      {children}
    </div>
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

  // Responsável / Admin master
  const [emailAdmin,    setEmailAdmin]    = useState('')
  const [contatoNome,   setContatoNome]   = useState('')
  const [cpfAdmin,      setCpfAdmin]      = useState('')
  const [cargoAdmin,    setCargoAdmin]    = useState('')
  const [ingresseId,    setIngresseId]    = useState('')

  // Empresa
  const [nome,          setNome]          = useState('')
  const [codigoCp,      setCodigoCp]      = useState('')
  const [origem,        setOrigem]        = useState('')

  // Comercial
  const [situacao,      setSituacao]      = useState<Situacao>('trial')
  const [plano,         setPlano]         = useState('Essencial')
  const [trialDias,     setTrialDias]     = useState(90)
  const [mrr,           setMrr]           = useState('')
  const [setupValor,    setSetupValor]    = useState('')
  const [setupPago,     setSetupPago]     = useState(false)
  const [enviarEmail,   setEnviarEmail]   = useState(true)
  const [responsavel,   setResponsavel]   = useState('')

  // Saúde
  const [score,         setScore]         = useState<Score>('normal')
  const [implantacao,   setImplantacao]   = useState(0)

  // Notas
  const [obs,           setObs]           = useState('')

  const [saving, setSaving] = useState(false)
  const [tab, setTab]       = useState<'cadastro' | 'saude'>('cadastro')

  useEffect(() => {
    if (open) {
      if (initial) {
        const c = initial as Cliente & {
          email_admin?: string; contato_nome?: string; cpf_admin?: string
          cargo_admin?: string; ingresse_id?: string; origem_entrada?: string
          trial_dias?: number; setup_valor?: number; setup_pago?: boolean; enviar_email?: boolean
        }
        setEmailAdmin(c.email_admin ?? '')
        setContatoNome(c.contato_nome ?? '')
        setCpfAdmin(c.cpf_admin ?? '')
        setCargoAdmin(c.cargo_admin ?? '')
        setIngresseId(c.ingresse_id ?? '')
        setNome(c.nome_franquia)
        setCodigoCp(c.codigo_cp ?? '')
        setOrigem(c.origem_entrada ?? '')
        setSituacao(c.situacao)
        setPlano(c.plano ?? 'Essencial')
        setTrialDias(c.trial_dias ?? 90)
        setMrr(c.mrr?.toString() ?? '')
        setSetupValor(c.setup_valor?.toString() ?? '')
        setSetupPago(c.setup_pago ?? false)
        setEnviarEmail(c.enviar_email ?? true)
        setResponsavel(c.responsavel ?? '')
        setScore(c.score ?? 'normal')
        setImplantacao(c.implantacao ?? 0)
        setObs(c.obs ?? '')
      } else {
        // Reset para novo cadastro
        setEmailAdmin(''); setContatoNome(''); setCpfAdmin(''); setCargoAdmin('')
        setIngresseId(''); setNome(''); setCodigoCp(''); setOrigem('')
        setSituacao('trial'); setPlano('Essencial'); setTrialDias(90)
        setMrr(''); setSetupValor(''); setSetupPago(false); setEnviarEmail(true)
        setResponsavel(''); setScore('normal'); setImplantacao(0); setObs('')
        setTab('cadastro')
      }
    }
  }, [open, initial])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Nome da empresa obrigatório.'); return }
    if (isNew && !emailAdmin.trim()) { toast.error('E-mail do admin master obrigatório.'); return }

    setSaving(true)
    try {
      const payload = {
        nome_franquia:   nome.trim(),
        codigo_cp:       codigoCp.trim() || null,
        email_admin:     emailAdmin.trim() || null,
        contato_nome:    contatoNome.trim() || null,
        cpf_admin:       cpfAdmin.trim() || null,
        cargo_admin:     cargoAdmin.trim() || null,
        ingresse_id:     ingresseId.trim() || null,
        origem_entrada:  origem || null,
        situacao,
        plano:           plano || null,
        trial_dias:      trialDias,
        mrr:             mrr ? parseFloat(mrr) : null,
        setup_valor:     setupValor && !setupPago ? parseFloat(setupValor) : null,
        setup_pago:      setupPago,
        enviar_email:    enviarEmail,
        responsavel:     responsavel.trim() || null,
        score,
        implantacao,
        obs:             obs.trim() || null,
        ativo:           true,
      }

      if (initial) {
        // Editar cliente existente
        const { error } = await supabase.from('tenants').update(payload).eq('id', initial.id)
        if (error) throw error
        toast.success('Cliente atualizado.')

      } else {
        // Criar novo cliente + enviar convite
        const { data: tenant, error: tenantErr } = await supabase
          .from('tenants').insert(payload).select().single()
        if (tenantErr) throw tenantErr

        if (enviarEmail && emailAdmin) {
          // Cria usuário via signUp — envia e-mail de confirmação/definição de senha
          const { error: authErr } = await supabase.auth.signUp({
            email:    emailAdmin.trim(),
            password: `Ank@${Math.random().toString(36).slice(2, 10)}`,   // senha temp descartável
            options: {
              data: {
                full_name:   contatoNome.trim() || nome.trim(),
                ingresse_id: ingresseId.trim(),
                tenant_id:   tenant.id,
              },
              emailRedirectTo: `${window.location.origin}/login`,
            },
          })

          if (authErr) {
            console.warn('[ClienteModal] Auth signUp error:', authErr.message)
            toast('Cliente criado. Falha ao enviar e-mail automaticamente — envie as credenciais manualmente.', { icon: '⚠️' })
          } else {
            toast.success('Cliente cadastrado! E-mail de definição de senha enviado.')
          }
        } else {
          toast.success('Cliente cadastrado com sucesso.')
        }
      }

      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  const setupLiquido = setupValor && !setupPago
    ? parseFloat(setupValor || '0')
    : 0

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={isNew ? '➕ Novo Cliente (Franqueado)' : `Editar — ${initial?.nome_franquia}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="cliente-form" type="submit" loading={saving}>
            {isNew ? 'Cadastrar e Enviar Convite' : 'Salvar Alterações'}
          </Button>
        </>
      }
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5 -mt-1">
        {[['cadastro','Cadastro'],['saude','Saúde & Comercial']] .map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id as 'cadastro' | 'saude')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === id
                ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <form id="cliente-form" onSubmit={handleSubmit} className="space-y-6">

        {/* ── ABA CADASTRO ──────────────────────────────────────────── */}
        {tab === 'cadastro' && (
          <>
            <Section title="Admin Master da Franquia">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input label="E-mail do dono *" type="email" value={emailAdmin}
                    onChange={e => setEmailAdmin(e.target.value)} required={isNew}
                    placeholder="dono@empresa.com.br"
                    hint="Vai virar o admin master da empresa." />
                </div>
                <Input label="Nome do contato" value={contatoNome}
                  onChange={e => setContatoNome(e.target.value)} placeholder="João da Silva" />
                <Input label="CPF do admin" value={cpfAdmin}
                  onChange={e => setCpfAdmin(e.target.value)} placeholder="000.000.000-00"
                  hint="Vincula ao cadastro de colaborador depois." />
                <Input label="Cargo do admin na empresa" value={cargoAdmin}
                  onChange={e => setCargoAdmin(e.target.value)} placeholder="Gerente de RH, Diretora, Sócia..." />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Usuário do Ingresse *
                    <span className="ml-1.5 text-xs text-violet-600 dark:text-violet-400 font-normal">
                      (usado para login no sistema)
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🎫</span>
                    <input type="text" value={ingresseId}
                      onChange={e => setIngresseId(e.target.value)}
                      placeholder="Ex: ING-12345 ou username"
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                        bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                        pl-9 pr-3 py-2.5 text-sm focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
                  </div>
                  <p className="text-xs text-slate-400">Identificador do cliente no sistema Ingresse. Será o login de acesso.</p>
                </div>
              </div>
            </Section>

            <Section title="Empresa">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input label="Nome da empresa *" value={nome}
                    onChange={e => setNome(e.target.value)} required
                    placeholder="Ex: Boticário – CP Manoel" />
                </div>
                <Input label="Código CP" value={codigoCp}
                  onChange={e => setCodigoCp(e.target.value)} placeholder="Ex: 851424" />
                <Input label="Responsável ANK" value={responsavel}
                  onChange={e => setResponsavel(e.target.value)} placeholder="Account Manager" />

                {/* Origem */}
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Origem da entrada</label>
                  <select value={origem} onChange={e => setOrigem(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                      bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                    <option value="">De onde veio esse cliente</option>
                    {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <p className="text-xs text-slate-400">Filtra leads no painel comercial depois.</p>
                </div>
              </div>
            </Section>

            <Section title="Plano e Contrato">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plano *</label>
                  <select value={plano} onChange={e => setPlano(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                      bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                    <option value="">Selecionar plano</option>
                    {PLANOS_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trial / Carência (dias)</label>
                  <input type="number" min={0} max={365} value={trialDias}
                    onChange={e => setTrialDias(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                      bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm" />
                  <p className="text-[10px] text-slate-400">0 = já contratado · 90 = trial padrão · 30 = teste estendido</p>
                </div>

                {/* Valor do Setup */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valor do Setup (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                    <input type="number" min={0} step="0.01" value={setupValor}
                      onChange={e => setSetupValor(e.target.value)} placeholder="0,00"
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                        bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2.5 text-sm" />
                  </div>
                  {setupValor && parseFloat(setupValor) > 0 && !setupPago && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Setup a cobrar: R$ {parseFloat(setupValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                  {setupPago && (
                    <p className="text-[10px] text-slate-400">Setup isento (marcado como pago)</p>
                  )}
                </div>

                {/* MRR */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">MRR Mensal (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                    <input type="number" min={0} step="0.01" value={mrr}
                      onChange={e => setMrr(e.target.value)} placeholder="0,00"
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                        bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2.5 text-sm" />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <Toggle
                  checked={setupPago}
                  onChange={setSetupPago}
                  label="Setup pago"
                  desc={setupPago ? 'Setup marcado como já pago — valor não será cobrado.' : 'Marque se o cliente já pagou ou foi isento do setup.'}
                />
                <Toggle
                  checked={enviarEmail}
                  onChange={setEnviarEmail}
                  label='Enviar e-mail "defina sua senha"'
                  desc="Recomendado. O cliente receberá um link para criar a própria senha de acesso."
                />
              </div>
            </Section>

            {/* Observações */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações (interno)</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                placeholder="Cliente piloto. 90 dias de carência. Pagamento começa em julho/26."
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm resize-none" />
            </div>
          </>
        )}

        {/* ── ABA SAÚDE ─────────────────────────────────────────────── */}
        {tab === 'saude' && (
          <>
            <Section title="Situação Atual">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Situação</label>
                  <select value={situacao} onChange={e => setSituacao(e.target.value as Situacao)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                      bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                    {(Object.keys(SITUACAO_CONFIG) as Situacao[]).map(s => (
                      <option key={s} value={s}>{SITUACAO_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section title="Score de Saúde">
              <div className="flex flex-wrap gap-2">
                {(Object.entries(SCORE_CONFIG) as [Score, typeof SCORE_CONFIG[Score]][]).map(([s, cfg]) => (
                  <button key={s} type="button" onClick={() => setScore(s)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border-2 transition-colors
                      ${score === s ? `ring-1 ring-inset ${cfg.badge} border-current` : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Implantação">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Progresso de implantação</span>
                  <span className="font-bold text-ank-600 dark:text-ank-400">{implantacao}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={implantacao}
                  onChange={e => setImplantacao(Number(e.target.value))}
                  className="w-full accent-ank-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0% — Início</span><span>50% — Em andamento</span><span>100% — Concluída</span>
                </div>
              </div>
            </Section>
          </>
        )}
      </form>
    </Modal>
  )
}
