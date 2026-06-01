import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import type { Cliente, Situacao, Score } from './ClientesListPage'
import { SCORE_CONFIG, SITUACAO_CONFIG, PLANOS } from './ClientesListPage'

const PLANOS_OPTS = ['Starter', 'Essencial', 'Pro', 'Enterprise']

export default function ClienteModal({ open, initial, onClose, onSaved }: {
  open: boolean
  initial: Cliente | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nome,         setNome]         = useState('')
  const [codigoCp,     setCodigoCp]     = useState('')
  const [plano,        setPlano]        = useState('Essencial')
  const [mrr,          setMrr]          = useState('')
  const [situacao,     setSituacao]     = useState<Situacao>('trial')
  const [trialEnd,     setTrialEnd]     = useState('')
  const [implantacao,  setImplantacao]  = useState(0)
  const [score,        setScore]        = useState<Score>('normal')
  const [responsavel,  setResponsavel]  = useState('')
  const [obs,          setObs]          = useState('')
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    if (open) {
      if (initial) {
        setNome(initial.nome_franquia)
        setCodigoCp(initial.codigo_cp ?? '')
        setPlano(initial.plano ?? 'Essencial')
        setMrr(initial.mrr?.toString() ?? '')
        setSituacao(initial.situacao)
        setTrialEnd(initial.trial_end?.substring(0, 10) ?? '')
        setImplantacao(initial.implantacao ?? 0)
        setScore(initial.score ?? 'normal')
        setResponsavel(initial.responsavel ?? '')
        setObs(initial.obs ?? '')
      } else {
        setNome(''); setCodigoCp(''); setPlano('Essencial'); setMrr('')
        setSituacao('trial'); setTrialEnd(''); setImplantacao(0)
        setScore('normal'); setResponsavel(''); setObs('')
      }
    }
  }, [open, initial])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Nome obrigatório.'); return }
    setSaving(true)
    try {
      const payload = {
        nome_franquia: nome.trim(),
        codigo_cp:     codigoCp.trim() || null,
        plano:         plano || null,
        mrr:           mrr ? parseFloat(mrr) : null,
        situacao,
        trial_end:     trialEnd || null,
        implantacao,
        score,
        responsavel:   responsavel.trim() || null,
        obs:           obs.trim() || null,
      }

      if (initial) {
        const { error } = await supabase.from('tenants').update(payload).eq('id', initial.id)
        if (error) throw error
        toast.success('Cliente atualizado.')
      } else {
        const { error } = await supabase.from('tenants').insert({ ...payload, ativo: true })
        if (error) throw error
        toast.success('Cliente cadastrado.')
      }
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={initial ? `Editar — ${initial.nome_franquia}` : 'Novo Cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="cliente-form" type="submit" loading={saving}>
            {initial ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form id="cliente-form" onSubmit={handleSubmit} className="space-y-5">

        {/* Dados básicos */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Identificação</p>
          <div className="space-y-3">
            <Input label="Nome da Empresa *" value={nome} onChange={e => setNome(e.target.value)} required
              placeholder="Ex: Boticário – CP Manoel" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Código CP" value={codigoCp} onChange={e => setCodigoCp(e.target.value)}
                placeholder="Ex: 851424" />
              <Input label="Responsável ANK" value={responsavel} onChange={e => setResponsavel(e.target.value)}
                placeholder="Nome do Account Manager" />
            </div>
          </div>
        </section>

        {/* Comercial */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Comercial</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Situação */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Situação</label>
              <select value={situacao} onChange={e => setSituacao(e.target.value as Situacao)}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                  text-slate-900 dark:text-slate-100 px-3 py-2 text-sm">
                {(Object.keys(SITUACAO_CONFIG) as Situacao[]).map(s => (
                  <option key={s} value={s}>{SITUACAO_CONFIG[s].label}</option>
                ))}
              </select>
            </div>

            {/* Plano */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plano</label>
              <select value={plano} onChange={e => setPlano(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                  text-slate-900 dark:text-slate-100 px-3 py-2 text-sm">
                {PLANOS_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* MRR */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">MRR (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                <input type="number" min={0} step="0.01" value={mrr}
                  onChange={e => setMrr(e.target.value)} placeholder="0,00"
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                    text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2 text-sm" />
              </div>
            </div>

            {/* Trial end */}
            <Input label="Fim do Trial" type="date" value={trialEnd}
              onChange={e => setTrialEnd(e.target.value)} />
          </div>
        </section>

        {/* Score + Implantação */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Saúde</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Score */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Score</label>
              <div className="flex gap-2">
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                Implantação: {implantacao}%
              </label>
              <input type="range" min={0} max={100} step={5} value={implantacao}
                onChange={e => setImplantacao(Number(e.target.value))}
                className="w-full accent-ank-600" />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Observações */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
            placeholder="Notas internas, histórico, contexto…"
            className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm resize-none" />
        </div>
      </form>
    </Modal>
  )
}

// Re-export para uso em outros arquivos
export { PLANOS_OPTS as PLANOS }
