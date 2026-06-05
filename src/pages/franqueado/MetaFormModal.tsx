import { useState, useEffect, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { MetasService } from '../../services/metas.service'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import type { Meta, MetaUpsertData } from '../../types'
import { CICLO_MES, MESES_LABELS, MARCAS_BOTICARIO } from '../../types'

interface Props {
  open: boolean
  initial: Meta | null
  tenantId: string
  onClose: () => void
  onSaved: () => void
}

const CANAL_OPTS = ['LOJA', 'VD'] as const
const CICLOS = Array.from({ length: 17 }, (_, i) => i + 1)
const ANO_ATUAL = new Date().getFullYear()

const numOrNull = (v: string) => v.trim() === '' ? null : parseFloat(v.replace(',', '.'))
const intOrNull = (v: string) => v.trim() === '' ? null : parseInt(v, 10)

function Field({ label, value, onChange, type = 'text', readOnly, hint }: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; readOnly?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type} value={value} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        className={`block w-full rounded-lg border px-3 py-2 text-sm transition-colors
          ${readOnly
            ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200 dark:focus:ring-ank-900'
          }`}
      />
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  )
}

export default function MetaFormModal({ open, initial, tenantId, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  // Temporal
  const [ano,   setAno]   = useState(String(ANO_ATUAL))
  const [ciclo, setCiclo] = useState('1')
  const mesDerived = CICLO_MES[parseInt(ciclo)] ?? 1

  // Estrutural
  const [codPdv,  setCodPdv]  = useState('')
  const [codCp,   setCodCp]   = useState('')
  const [nomeCp,  setNomeCp]  = useState('')
  const [canal,   setCanal]   = useState<'LOJA' | 'VD'>('LOJA')
  const [marca,   setMarca]   = useState('BOT')

  // KPIs
  const [gmv,            setGmv]            = useState('')
  const [rpa,            setRpa]            = useState('')
  const [baseTotal,      setBaseTotal]      = useState('')
  const [atividadeTotal, setAtividadeTotal] = useState('')
  const [ativasTotais,   setAtivasTotais]   = useState('')
  const [ativasTotaisGb, setAtivasTotaisGb] = useState('')
  const [penetracao,     setPenetracao]     = useState('')
  const [numBoletos,     setNumBoletos]     = useState('')
  const [boletoMedio,    setBoletoMedio]    = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setAno(String(initial.ano))
      setCiclo(String(initial.ciclo))
      setCodPdv(initial.cod_pdv)
      setCodCp(initial.cod_cp)
      setNomeCp(initial.nome_cp ?? '')
      setCanal(initial.canal)
      setMarca(initial.marca)
      setGmv(initial.gmv != null ? String(initial.gmv) : '')
      setRpa(initial.rpa != null ? String(initial.rpa) : '')
      setBaseTotal(initial.base_total != null ? String(initial.base_total) : '')
      setAtividadeTotal(initial.atividade_total != null ? String(initial.atividade_total) : '')
      setAtivasTotais(initial.ativas_totais != null ? String(initial.ativas_totais) : '')
      setAtivasTotaisGb(initial.ativas_totais_gb != null ? String(initial.ativas_totais_gb) : '')
      setPenetracao(initial.penetracao != null ? String(initial.penetracao) : '')
      setNumBoletos(initial.numero_boletos != null ? String(initial.numero_boletos) : '')
      setBoletoMedio(initial.boleto_medio != null ? String(initial.boleto_medio) : '')
    } else {
      setAno(String(ANO_ATUAL)); setCiclo('1'); setCodPdv(''); setCodCp('')
      setNomeCp(''); setCanal('LOJA'); setMarca('BOT')
      setGmv(''); setRpa(''); setBaseTotal(''); setAtividadeTotal('')
      setAtivasTotais(''); setAtivasTotaisGb(''); setPenetracao('')
      setNumBoletos(''); setBoletoMedio('')
    }
  }, [open, initial])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!codPdv.trim() || !codCp.trim()) {
      toast.error('Cod. PDV e Cod. CP são obrigatórios.'); return
    }
    const anoNum = parseInt(ano, 10)
    const cicloNum = parseInt(ciclo, 10)
    if (isNaN(anoNum) || anoNum < 2020 || anoNum > 2099) {
      toast.error('Ano inválido.'); return
    }

    setSaving(true)
    const row: MetaUpsertData = {
      tenant_id:        tenantId,
      ano:              anoNum,
      ciclo:            cicloNum,
      mes:              CICLO_MES[cicloNum],
      cod_pdv:          codPdv.trim().toUpperCase(),
      cod_cp:           codCp.trim(),
      nome_cp:          nomeCp.trim() || null,
      canal,
      marca,
      gmv:              numOrNull(gmv),
      rpa:              numOrNull(rpa),
      base_total:       numOrNull(baseTotal),
      atividade_total:  numOrNull(atividadeTotal),
      ativas_totais:    intOrNull(ativasTotais),
      ativas_totais_gb: intOrNull(ativasTotaisGb),
      penetracao:       numOrNull(penetracao),
      numero_boletos:   intOrNull(numBoletos),
      boleto_medio:     numOrNull(boletoMedio),
      fonte:            'manual',
      importado_por:    user?.id ?? null,
    }

    try {
      const { error } = await MetasService.upsert([row])
      if (error) throw error
      toast.success(initial ? 'Meta atualizada.' : 'Meta criada.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  const selectCls = `block w-full rounded-lg border border-slate-300 dark:border-slate-600
    bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm
    focus:border-ank-400 focus:outline-none`

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={initial ? `Editar Meta — PDV ${initial.cod_pdv}` : 'Nova Meta'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button form="meta-form" type="submit" loading={saving}>
            {initial ? 'Salvar alterações' : 'Criar meta'}
          </Button>
        </>
      }
    >
      <form id="meta-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Temporal */}
        <section>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Período
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ano *" value={ano} onChange={setAno} type="number" hint="Ex: 2025" />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Ciclo *
              </label>
              <select value={ciclo} onChange={e => setCiclo(e.target.value)} className={selectCls}>
                {CICLOS.map(c => (
                  <option key={c} value={c}>
                    Ciclo {c} — {MESES_LABELS[CICLO_MES[c]]}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Mês (derivado)" value={MESES_LABELS[mesDerived]} readOnly />
          </div>
        </section>

        {/* Estrutural */}
        <section>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Identificação
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cod. PDV *" value={codPdv} onChange={setCodPdv} hint="Ex: 5985" />
            <Field label="Cod. CP *"  value={codCp}  onChange={setCodCp}  hint="Ex: 851424" />
            <Field label="Nome CP"    value={nomeCp}  onChange={setNomeCp} hint="Nome da franquia" />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Canal *</label>
                <select value={canal} onChange={e => setCanal(e.target.value as 'LOJA' | 'VD')} className={selectCls}>
                  {CANAL_OPTS.map(c => <option key={c} value={c}>{c === 'LOJA' ? '🏪 Loja' : '🚀 VD'}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Marca *</label>
                <select value={marca} onChange={e => setMarca(e.target.value)} className={selectCls}>
                  {MARCAS_BOTICARIO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            KPIs
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="GMV (R$)"          value={gmv}            onChange={setGmv}            type="number" />
            <Field label="RPA (R$)"           value={rpa}            onChange={setRpa}            type="number" />
            <Field label="Base Total"         value={baseTotal}      onChange={setBaseTotal}      type="number" />
            <Field label="Atividade Total"    value={atividadeTotal} onChange={setAtividadeTotal} type="number" />
            <Field label="Ativas Totais"      value={ativasTotais}   onChange={setAtivasTotais}   type="number" />
            <Field label="Ativas Totais GB"   value={ativasTotaisGb} onChange={setAtivasTotaisGb} type="number" />
            <Field label="Penetração (%)"     value={penetracao}     onChange={setPenetracao}     type="number" hint="Ex: 35.5" />
            <Field label="Nº Boletos"         value={numBoletos}     onChange={setNumBoletos}     type="number" />
            <Field label="Boleto Médio (R$)"  value={boletoMedio}    onChange={setBoletoMedio}    type="number" />
          </div>
        </section>
      </form>
    </Modal>
  )
}
