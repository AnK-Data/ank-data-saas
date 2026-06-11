import { useEffect, useState, type FormEvent } from 'react'
import { PlusIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'

interface MóduloCatalogo {
  id: string
  nome: string
  descricao: string | null
  preco_mensal: number | null
  preco_setup: number | null
  feature_slugs: string[] | null
  ativo: boolean
  created_at: string
}

const brl = (v: number | null) =>
  v == null ? 'Sob consulta' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default function MódulosCatalogoPage() {
  const [módulos, setMódulos]       = useState<MóduloCatalogo[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<MóduloCatalogo | null>(null)
  const [creating, setCreating]   = useState(false)
  const [toggling, setToggling]   = useState<string | null>(null)

  async function fetchMódulos() {
    const { data } = await supabase
      .from('planos_catalogo')
      .select('*')
      .order('preco_mensal', { ascending: true, nullsFirst: false })
    setMódulos((data ?? []) as MóduloCatalogo[])
    setLoading(false)
  }

  useEffect(() => { fetchMódulos() }, [])

  async function toggleAtivo(p: MóduloCatalogo) {
    setToggling(p.id)
    await supabase.from('planos_catalogo').update({ ativo: !p.ativo }).eq('id', p.id)
    toast.success(p.ativo ? 'Módulo desativado.' : 'Módulo ativado.')
    await fetchMódulos()
    setToggling(null)
  }

  if (loading) return <Spinner fullScreen />

  const ativos   = módulos.filter(p => p.ativo).length
  const mrrTotal = módulos.filter(p => p.ativo && p.preco_mensal).reduce((s, p) => s + (p.preco_mensal ?? 0), 0)

  return (
    <>
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Módulos ativos',    value: ativos,                   color: 'text-emerald-600' },
          { label: 'Módulos no catálogo', value: módulos.length,          color: 'text-slate-800 dark:text-slate-100' },
          { label: 'MRR soma módulos',  value: brl(mrrTotal || null),    color: 'text-violet-600' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-800">
          <CardHeader
            title="Catálogo de Módulos"
            subtitle="Defina os módulos disponíveis para as franquias"
            action={
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Novo Módulo
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-6 py-3">Módulo</th>
                <th className="px-6 py-3">Slugs de acesso</th>
                <th className="px-6 py-3 text-right">Mensalidade</th>
                <th className="px-6 py-3 text-right">Setup</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 dark:divide-slate-800">
              {módulos.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhum módulo cadastrado.</td></tr>
              ) : módulos.map(p => (
                <tr key={p.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50 ${!p.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{p.nome}</td>
                  <td className="px-6 py-4 text-xs max-w-xs">
                    {(p.feature_slugs ?? []).length === 0
                      ? <span className="text-amber-500">⚠ sem slug</span>
                      : (p.feature_slugs ?? []).map(s => (
                          <code key={s} className="mr-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">{s}</code>
                        ))
                    }
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">{brl(p.preco_mensal)}</td>
                  <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{brl(p.preco_setup)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
                      ${p.ativo
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 ring-slate-300 dark:bg-slate-800 dark:text-slate-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                        onClick={() => setEditing(p)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" loading={toggling === p.id}
                        onClick={() => toggleAtivo(p)}>
                        {p.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {(creating || editing) && (
        <MóduloModal
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={async () => { setCreating(false); setEditing(null); setLoading(true); await fetchMódulos() }}
        />
      )}
    </>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function MóduloModal({ initial, onClose, onSaved }: {
  initial: MóduloCatalogo | null; onClose: () => void; onSaved: () => void
}) {
  const [nome,           setNome]           = useState(initial?.nome ?? '')
  const [descricao,      setDescricao]      = useState(initial?.descricao ?? '')
  const [precoMensal,    setPrecoMensal]    = useState(initial?.preco_mensal?.toString() ?? '')
  const [precoSetup,     setPrecoSetup]     = useState(initial?.preco_setup?.toString() ?? '0')
  const [featureSlugs,   setFeatureSlugs]   = useState((initial?.feature_slugs ?? []).join(', '))
  const [saving,         setSaving]         = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Nome obrigatório.'); return }
    setSaving(true)
    try {
      const slugsArr = featureSlugs.split(',').map(s => s.trim()).filter(Boolean)
      const payload = {
        nome:          nome.trim(),
        descricao:     descricao.trim() || null,
        preco_mensal:  precoMensal ? parseFloat(precoMensal) : null,
        preco_setup:   precoSetup  ? parseFloat(precoSetup)  : 0,
        feature_slugs: slugsArr.length ? slugsArr : null,
      }
      const { error } = initial
        ? await supabase.from('planos_catalogo').update(payload).eq('id', initial.id)
        : await supabase.from('planos_catalogo').insert(payload)
      if (error) throw error
      toast.success(initial ? 'Módulo atualizado.' : 'Módulo criado.')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl
        ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {initial ? `Editar — ${initial.nome}` : 'Novo Módulo'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Input label="Nome do Módulo *" value={nome} onChange={e => setNome(e.target.value)} required
            placeholder="Ex: Starter, Pro, Enterprise" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              placeholder="O que está incluído neste módulo..."
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100 px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Slugs de acesso <span className="text-slate-400 font-normal">(separados por vírgula)</span>
            </label>
            <input
              value={featureSlugs}
              onChange={e => setFeatureSlugs(e.target.value)}
              placeholder="ex: venda-direta, vendas"
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm font-mono"
            />
            <p className="text-[10px] text-slate-400">
              Slugs que este módulo libera no sistema (ex: <code>venda-direta</code>, <code>financeiro</code>).
              Deve coincidir com o slug usado na sidebar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mensalidade (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                <input type="number" min={0} step="0.01" value={precoMensal}
                  onChange={e => setPrecoMensal(e.target.value)} placeholder="0,00"
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                    text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2.5 text-sm" />
              </div>
              <p className="text-[10px] text-slate-400">Deixe em branco para "Sob consulta"</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Setup (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                <input type="number" min={0} step="0.01" value={precoSetup}
                  onChange={e => setPrecoSetup(e.target.value)} placeholder="0,00"
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                    text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {initial ? 'Salvar' : 'Criar Módulo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
