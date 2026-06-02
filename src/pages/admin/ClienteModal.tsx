import { useState, useEffect, type FormEvent } from 'react'
import { UserPlusIcon } from '@heroicons/react/24/outline'
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
  const [planoCatId,   setPlanoCatId]   = useState('')
  const [mrr,          setMrr]          = useState('')
  const [situacao,     setSituacao]     = useState<Situacao>('trial')
  const [score,        setScore]        = useState<Score>('normal')
  const [implantacao,  setImplantacao]  = useState(0)
  const [responsavel,  setResponsavel]  = useState('')
  const [obs,          setObs]          = useState('')

  // Usuário base
  const [criarUsuario, setCriarUsuario] = useState(false)
  const [nomeAdmin,    setNomeAdmin]    = useState('')
  const [emailAdmin,   setEmailAdmin]   = useState('')
  const [senhaAdmin,   setSenhaAdmin]   = useState('')
  const [ingresseId,   setIngresseId]   = useState('')

  // Dados auxiliares
  const [planos, setPlanos] = useState<PlanoCatalogo[]>([])
  const [tab,    setTab]    = useState<'franquia' | 'comercial' | 'usuario'>('franquia')
  const [saving, setSaving] = useState(false)

  // Carrega planos do catálogo
  useEffect(() => {
    supabase.from('planos_catalogo').select('id, nome, preco_mensal, preco_setup')
      .eq('ativo', true).order('preco_mensal', { ascending: true, nullsFirst: false })
      .then(({ data }) => setPlanos((data ?? []) as PlanoCatalogo[]))
  }, [])

  // Inicializa formulário
  useEffect(() => {
    if (open) {
      setNomeFranquia(initial?.nome_franquia ?? '')
      setCodigoCp(initial?.codigo_cp ?? '')
      setDriveId((initial as Cliente & { google_drive_folder_id?: string })?.google_drive_folder_id ?? '')
      setPlanoCatId((initial as Cliente & { plano_catalogo_id?: string })?.plano_catalogo_id ?? '')
      setMrr(initial?.mrr?.toString() ?? '')
      setSituacao(initial?.situacao ?? 'trial')
      setScore(initial?.score ?? 'normal')
      setImplantacao(initial?.implantacao ?? 0)
      setResponsavel(initial?.responsavel ?? '')
      setObs(initial?.obs ?? '')
      setCriarUsuario(false); setNomeAdmin(''); setEmailAdmin(''); setSenhaAdmin(''); setIngresseId('')
      setTab('franquia')
    }
  }, [open, initial])

  // Plano selecionado
  const planoSel = planos.find(p => p.id === planoCatId)
  const mrrSugerido = planoSel?.preco_mensal

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nomeFranquia.trim()) { toast.error('Nome da franquia obrigatório.'); return }
    if (criarUsuario && isNew) {
      if (!emailAdmin.trim()) { toast.error('E-mail do admin obrigatório.'); return }
      if (senhaAdmin.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres.'); return }
    }
    setSaving(true)
    try {
      // Campos base — sempre existem
      const payload: Record<string, unknown> = {
        nome_franquia:          nomeFranquia.trim(),
        codigo_cp:              codigoCp.trim() || null,
        google_drive_folder_id: driveId.trim() || null,
        plano:                  planoSel?.nome ?? null,
        mrr:                    mrr ? parseFloat(mrr) : (mrrSugerido ?? null),
        situacao,
        score,
        implantacao,
        responsavel:            responsavel.trim() || null,
        obs:                    obs.trim() || null,
        ativo:                  true,
      }
      // Campo opcional — só inclui se a coluna existir (após migração)
      if (planoCatId) payload.plano_catalogo_id = planoCatId

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
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="cliente-hub-form" type="submit" loading={saving}>
            {isNew ? (criarUsuario ? 'Criar Franquia + Usuário' : 'Criar Franquia') : 'Salvar'}
          </Button>
        </>
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
              <Input label="Responsável ANK"
                value={responsavel} onChange={e => setResponsavel(e.target.value)}
                placeholder="Account Manager" />
            </div>

            <Input label="Google Drive Folder ID"
              value={driveId} onChange={e => setDriveId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
              hint="ID da pasta onde os arquivos de venda são depositados." />

            {/* Plano do catálogo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plano Contratado</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPlanoCatId('')}
                  className={`rounded-xl border-2 p-3 text-left transition-colors
                    ${!planoCatId ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sem plano definido</p>
                  <p className="text-[10px] text-slate-400">Definir depois</p>
                </button>
                {planos.map(p => (
                  <button key={p.id} type="button" onClick={() => setPlanoCatId(p.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-colors
                      ${planoCatId === p.id ? 'border-ank-400 bg-ank-50 dark:bg-ank-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.nome}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.preco_mensal != null ? `R$ ${p.preco_mensal.toLocaleString('pt-BR')}/mês` : 'Sob consulta'}
                      {p.preco_setup ? ` + R$ ${p.preco_setup.toLocaleString('pt-BR')} setup` : ''}
                    </p>
                  </button>
                ))}
              </div>
              {planoSel && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  ✓ MRR sugerido: R$ {planoSel.preco_mensal?.toLocaleString('pt-BR') ?? '—'}/mês
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">MRR (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input type="number" min={0} step="0.01" value={mrr}
                    onChange={e => setMrr(e.target.value)} placeholder={mrrSugerido?.toString() ?? '0,00'}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                      text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2.5 text-sm" />
                </div>
                {mrrSugerido && !mrr && (
                  <p className="text-[10px] text-slate-400">Sugerido pelo plano: R$ {mrrSugerido.toLocaleString('pt-BR')}</p>
                )}
              </div>
            </div>

            {/* Score */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Score de Saúde</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(SCORE_CONFIG) as [Score, typeof SCORE_CONFIG[Score]][]).map(([s, cfg]) => (
                  <button key={s} type="button" onClick={() => setScore(s)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border-2 transition-colors
                      ${score === s ? `ring-1 ring-inset ${cfg.badge} border-current` : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Implantação */}
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
