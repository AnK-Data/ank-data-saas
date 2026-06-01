import { useEffect, useState, useRef, type FormEvent } from 'react'
import { format, parseISO, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeftIcon, ArrowPathIcon, PlusIcon,
  LinkIcon, ClipboardDocumentIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

const PLANOS_OPTS = [
  { label: 'Starter — R$ 500,00/mês',    value: 'Starter',    preco: 500,   setup: 0     },
  { label: 'Essencial — R$ 1.200,00/mês', value: 'Essencial',  preco: 1200,  setup: 2000  },
  { label: 'Pro — R$ 2.500,00/mês',       value: 'Pro',        preco: 2500,  setup: 3000  },
  { label: 'Enterprise — sob consulta',   value: 'Enterprise', preco: null,  setup: null  },
]

interface Onboarding {
  id: string
  token: string
  email_cliente: string
  plano: string
  preco_negociado: number | null
  setup_negociado: number | null
  validade_dias: number
  obs: string | null
  status: 'pendente' | 'preenchido' | 'expirado'
  created_at: string
  expires_at: string | null
  preenchido_at: string | null
}

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [onboardings, setOnboardings] = useState<Onboarding[]>([])
  const [loading, setLoading]         = useState(true)
  const [panelOpen, setPanelOpen]     = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  async function fetchOnboardings() {
    const { data } = await supabase
      .from('onboardings')
      .select('*')
      .order('created_at', { ascending: false })
    setOnboardings((data ?? []) as Onboarding[])
    setLoading(false)
  }

  useEffect(() => { fetchOnboardings() }, [])

  function getStatus(o: Onboarding): 'preenchido' | 'expirado' | 'pendente' {
    if (o.status === 'preenchido') return 'preenchido'
    if (o.expires_at && isPast(parseISO(o.expires_at))) return 'expirado'
    return 'pendente'
  }

  function getLinkUrl(token: string) {
    return `${window.location.origin}/onboarding/${token}`
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(getLinkUrl(token))
    toast.success('Link copiado!')
  }

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin-ank/clientes')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
              hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Onboarding de Clientes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gere link público para o cliente preencher os dados e gerar contrato automaticamente.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm"
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            onClick={() => { setLoading(true); fetchOnboardings() }}>
            Atualizar
          </Button>
          <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setPanelOpen(true)}>
            + Novo onboarding
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {onboardings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center
            rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <LinkIcon className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-medium text-slate-600 dark:text-slate-400">Nenhum onboarding gerado ainda</p>
            <p className="text-sm text-slate-400 mt-1">
              Clique em "+ Novo onboarding" para gerar o primeiro link.
            </p>
          </div>
        ) : onboardings.map(o => {
          const st       = getStatus(o)
          const planoObj = PLANOS_OPTS.find(p => p.value === o.plano)
          const preco    = o.preco_negociado ?? planoObj?.preco
          const setup    = o.setup_negociado ?? planoObj?.setup

          return (
            <div key={o.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Status + Plano */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
                      ${st === 'preenchido'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : st === 'expirado'
                          ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400'
                          : 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
                      }`}>
                      {st === 'preenchido' ? '✓ Preenchido' : st === 'expirado' ? '⊗ Expirado' : '◎ Pendente'}
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Plano <strong>{o.plano}</strong>
                      {preco && ` • R$ ${preco.toLocaleString('pt-BR')},00/mês`}
                      {setup ? ` + R$ ${setup.toLocaleString('pt-BR')},00 setup` : ''}
                    </span>
                  </div>

                  {/* Email */}
                  <a href={`mailto:${o.email_cliente}`}
                    className="text-base font-semibold text-ank-600 dark:text-ank-400 hover:underline">
                    {o.email_cliente}
                  </a>

                  {/* Obs */}
                  {o.obs && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{o.obs}</p>
                  )}

                  {/* Datas */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>Criado: {format(parseISO(o.created_at), "dd/MM/yyyy, HH:mm", { locale: ptBR })}</span>
                    {o.expires_at && (
                      <span>• Expira: {format(parseISO(o.expires_at), "dd/MM/yyyy, HH:mm", { locale: ptBR })}</span>
                    )}
                    {o.preenchido_at && (
                      <span>• Preenchido: {format(parseISO(o.preenchido_at), "dd/MM/yyyy, HH:mm", { locale: ptBR })}</span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  {st !== 'expirado' && (
                    <button onClick={() => copyLink(o.token)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700
                        px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400
                        hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      title="Copiar link">
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      Copiar link
                    </button>
                  )}
                  {st === 'preenchido' && (
                    <button
                      className="flex items-center gap-1.5 rounded-xl border border-ank-200 dark:border-ank-700
                        px-3 py-1.5 text-xs font-medium text-ank-600 dark:text-ank-400
                        hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Contrato
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Painel deslizante: Novo Onboarding */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50"
            onClick={() => setPanelOpen(false)} />
          <div ref={panelRef}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md
              bg-white dark:bg-slate-900 shadow-2xl
              border-l border-slate-200 dark:border-slate-700
              flex flex-col">
            <NovoOnboardingPanel
              userId={user?.id ?? ''}
              onClose={() => setPanelOpen(false)}
              onSaved={async () => { setPanelOpen(false); setLoading(true); await fetchOnboardings() }}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Painel Novo Onboarding ───────────────────────────────────────────────────

function NovoOnboardingPanel({ userId, onClose, onSaved }: {
  userId: string; onClose: () => void; onSaved: () => void
}) {
  const [email,     setEmail]     = useState('')
  const [plano,     setPlano]     = useState('Essencial')
  const [preco,     setPreco]     = useState('')
  const [setup,     setSetup]     = useState('')
  const [validade,  setValidade]  = useState(7)
  const [obs,       setObs]       = useState('')
  const [saving,    setSaving]    = useState(false)
  const [generated, setGenerated] = useState<string | null>(null)

  const planoObj = PLANOS_OPTS.find(p => p.value === plano)

  useEffect(() => {
    if (planoObj?.preco)  setPreco(String(planoObj.preco))
    if (planoObj?.setup != null) setSetup(String(planoObj.setup))
  }, [plano])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { toast.error('E-mail do cliente obrigatório.'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('onboardings').insert({
        email_cliente:    email.trim(),
        plano,
        preco_negociado:  preco ? parseFloat(preco) : null,
        setup_negociado:  setup ? parseFloat(setup) : null,
        validade_dias:    validade,
        obs:              obs.trim() || null,
        criado_por:       userId,
      }).select().single()

      if (error) throw error
      const link = `${window.location.origin}/onboarding/${data.token}`
      setGenerated(link)
      await navigator.clipboard.writeText(link).catch(() => {})
      toast.success('Link gerado e copiado!')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar link.')
    } finally { setSaving(false) }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4 shrink-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Novo onboarding</h2>
        <button onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {generated ? (
          <div className="space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 mx-auto">
              <LinkIcon className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Link gerado!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Envie para o cliente via WhatsApp ou e-mail.</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{generated}</p>
            </div>
            <Button className="w-full" onClick={() => { navigator.clipboard.writeText(generated); toast.success('Copiado!') }}>
              📋 Copiar link
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setGenerated(null)}>
              Gerar outro
            </Button>
          </div>
        ) : (
          <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                E-mail do cliente *
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="contato@empresa.com.br"
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm
                  focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
              <p className="text-[10px] text-slate-400">
                Apenas referência interna — o link é enviado por você (WhatsApp/e-mail).
              </p>
            </div>

            {/* Plano */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plano *</label>
              <select value={plano} onChange={e => setPlano(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm">
                {PLANOS_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {planoObj?.preco && (
                <p className="text-[10px] text-slate-400">
                  Padrão: R$ {planoObj.preco.toLocaleString('pt-BR')},00/mês
                  {planoObj.setup ? ` + R$ ${planoObj.setup.toLocaleString('pt-BR')},00 setup` : ''}.
                </p>
              )}
            </div>

            {/* Preços negociados */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Preço negociado (R$)
                </label>
                <input type="number" min={0} step="0.01" value={preco}
                  onChange={e => setPreco(e.target.value)} placeholder={String(planoObj?.preco ?? 0)}
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Setup negociado (R$)
                </label>
                <input type="number" min={0} step="0.01" value={setup}
                  onChange={e => setSetup(e.target.value)} placeholder={String(planoObj?.setup ?? 0)}
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm" />
              </div>
              <p className="col-span-2 text-[10px] text-slate-400">
                Deixe em branco para usar o preço do catálogo.
              </p>
            </div>

            {/* Validade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Validade do link (dias)
              </label>
              <input type="number" min={1} max={30} value={validade}
                onChange={e => setValidade(Number(e.target.value))}
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm w-24" />
            </div>

            {/* Observações */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Observações internas (opcional)
              </label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                placeholder="Notas sobre a negociação, contexto do cliente..."
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm resize-none" />
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      {!generated && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button form="onboarding-form" type="submit" loading={saving} className="flex-1">
            Gerar link
          </Button>
        </div>
      )}
    </>
  )
}
