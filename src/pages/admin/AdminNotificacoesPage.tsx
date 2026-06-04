import { useEffect, useState } from 'react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BellAlertIcon, ExclamationTriangleIcon, MegaphoneIcon,
  ArrowPathIcon, EyeIcon, EyeSlashIcon, UsersIcon, ShieldCheckIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { ComplianceService } from '../../services/compliance.service'
import { TenantsService } from '../../services/tenants.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import type { TenantCompliance, UploadLog, Tenant } from '../../types'

type UploadRow = UploadLog & { tenant?: { nome_franquia?: string } }

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Tab = 'sistema' | 'anuncios' | 'conformidade'

interface TenantAlert {
  tenant_id: string
  nome_franquia: string
  codigo_cp: string | null
  tipo: 'sem_upload' | 'usuario_inativo'
  detalhe: string
  urgencia: 'alta' | 'media'
}

interface AdminComunicado {
  id: string
  titulo: string
  tipo: string
  created_at: string
  publicado: boolean
  lidos: number
  nao_lidos: number
  total_tenants: number
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AdminNotificacoesPage() {
  const [tab, setTab]     = useState<Tab>('sistema')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Sistema
  const [alertas, setAlertas]     = useState<TenantAlert[]>([])

  // Anúncios
  const [comunicados, setComunicados] = useState<AdminComunicado[]>([])
  const [totalTenants, setTotalTenants] = useState(0)

  // Conformidade
  const [compliance, setCompliance] = useState<TenantCompliance[]>([])
  const [uploadLogs, setUploadLogs] = useState<UploadRow[]>([])

  async function loadSistema(isRefresh = false) {
    if (isRefresh) setRefreshing(true)

    // Busca tenants sem upload recente (últimos 7 dias)
    const { data: compliance } = await supabase
      .rpc('check_tenant_compliance')
      .then(r => r)

    // Busca total de tenants
    const { count } = await supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('ativo', true)
    setTotalTenants(count ?? 0)

    const novosAlertas: TenantAlert[] = []

    // Franquias comprometidas
    ;(compliance ?? []).forEach((c: { tenant_id: string; tenant_name: string; days_since_upload: number | null }) => {
      if (c.days_since_upload !== null && c.days_since_upload > 7) {
        novosAlertas.push({
          tenant_id: c.tenant_id,
          nome_franquia: c.tenant_name,
          codigo_cp: null,
          tipo: 'sem_upload',
          detalhe: `${c.days_since_upload} dias sem envio de arquivo`,
          urgencia: c.days_since_upload > 14 ? 'alta' : 'media',
        })
      }
    })

    // Usuários inativos há mais de 30 dias
    const { data: inativos } = await supabase
      .from('profiles')
      .select('id, nome, ultimo_acesso, tenant_id, tenant:tenants(nome_franquia)')
      .not('ultimo_acesso', 'is', null)
      .lt('ultimo_acesso', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .in('papel', ['franqueado', 'gerente_loja', 'gerente_canal_loja'])
      .limit(20)

    ;(inativos ?? []).forEach((u: {
      id: string; nome: string; ultimo_acesso: string; tenant_id: string
      tenant?: { nome_franquia?: string } | { nome_franquia?: string }[] | null
    }) => {
      const tenantNome = Array.isArray(u.tenant)
        ? u.tenant[0]?.nome_franquia
        : (u.tenant as { nome_franquia?: string } | null)?.nome_franquia
      const diasInativo = Math.floor((Date.now() - new Date(u.ultimo_acesso).getTime()) / (1000 * 60 * 60 * 24))
      novosAlertas.push({
        tenant_id: u.tenant_id,
        nome_franquia: tenantNome ?? 'Franquia',
        codigo_cp: null,
        tipo: 'usuario_inativo',
        detalhe: `${u.nome} — inativo há ${diasInativo} dias`,
        urgencia: diasInativo > 60 ? 'alta' : 'media',
      })
    })

    setAlertas(novosAlertas.sort((a, b) => (a.urgencia === 'alta' ? -1 : 1) - (b.urgencia === 'alta' ? -1 : 1)))
    if (isRefresh) setRefreshing(false)
  }

  async function loadAnuncios() {
    const { data } = await supabase
      .from('admin_comunicados')
      .select('id, titulo, tipo, created_at, publicado')
      .eq('publicado', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) { setComunicados([]); return }

    // Para cada comunicado, conta lidos
    const enriched = await Promise.all((data as AdminComunicado[]).map(async com => {
      const { count: lidos } = await supabase
        .from('admin_comunicados_leitura')
        .select('*', { count: 'exact', head: true })
        .eq('comunicado_id', com.id)
      return {
        ...com,
        lidos: lidos ?? 0,
        nao_lidos: Math.max(0, totalTenants - (lidos ?? 0)),
        total_tenants: totalTenants,
      }
    }))
    setComunicados(enriched)
  }

  async function loadConformidade() {
    const [complianceRes, logsRes, tenantsRes] = await Promise.all([
      ComplianceService.check(),
      ComplianceService.recentLogs(50),
      TenantsService.list(),
    ])
    if (!complianceRes.error) {
      const tenantMap = new Map(((tenantsRes.data ?? []) as Tenant[]).map(t => [t.id, t]))
      const merged = ((complianceRes.data ?? []) as TenantCompliance[]).map(c => ({
        ...c,
        codigo_cp: tenantMap.get(c.tenant_id)?.codigo_cp ?? null,
      }))
      setCompliance(merged)
    } else {
      toast.error('Erro ao carregar conformidade.')
    }
    if (!logsRes.error && logsRes.data) setUploadLogs(logsRes.data as UploadRow[])
  }

  async function loadAll(isRefresh = false) {
    if (!isRefresh) setLoading(true)
    await Promise.all([loadSistema(isRefresh), loadAnuncios(), loadConformidade()])
    if (!isRefresh) setLoading(false)
    if (isRefresh) setRefreshing(false)
  }

  useEffect(() => { loadAll() }, [totalTenants])

  const comprometidas = compliance.filter(c => c.compliance_status === 'COMPROMETIDO')

  const TABS = [
    { id: 'sistema',      icon: ExclamationTriangleIcon, label: 'Sistema',      count: alertas.length },
    { id: 'anuncios',     icon: MegaphoneIcon,           label: 'Anúncios',     count: comunicados.length },
    { id: 'conformidade', icon: ShieldCheckIcon,         label: 'Conformidade', count: comprometidas.length },
  ] as const

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
          <BellAlertIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notificações</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Alertas do sistema e analytics de comunicados enviados.
          </p>
        </div>
        <Button variant="secondary" size="sm" loading={refreshing}
          leftIcon={<ArrowPathIcon className="h-4 w-4" />}
          onClick={() => loadAll(true)}>
          Atualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id
                ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                ${t.id === 'sistema' && alertas.some(a => a.urgencia === 'alta')
                  ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ABA SISTEMA ──────────────────────────────────────────────── */}
      {tab === 'sistema' && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'CPs sem upload (7d+)',
                value: alertas.filter(a => a.tipo === 'sem_upload').length,
                color: alertas.filter(a => a.tipo === 'sem_upload').length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
              },
              {
                label: 'Usuários inativos (30d+)',
                value: alertas.filter(a => a.tipo === 'usuario_inativo').length,
                color: alertas.filter(a => a.tipo === 'usuario_inativo').length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
              },
              {
                label: 'Total de clientes ativos',
                value: totalTenants,
                color: 'text-slate-900 dark:text-slate-100',
                bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700',
              },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-5 ${s.bg}`}>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Lista de alertas */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <CardHeader title="Alertas ativos" subtitle={`${alertas.length} ocorrência${alertas.length !== 1 ? 's' : ''}`} />
            </div>

            {alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
                  <span className="text-2xl">✅</span>
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300">Tudo em ordem!</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Nenhum alerta de sistema no momento.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {alertas.map((alerta, i) => (
                  <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                      ${alerta.urgencia === 'alta'
                        ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'}`}>
                      {alerta.tipo === 'sem_upload'
                        ? <ExclamationTriangleIcon className="h-4 w-4" />
                        : <UsersIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{alerta.nome_franquia}</p>
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                          ${alerta.urgencia === 'alta'
                            ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'}`}>
                          {alerta.urgencia === 'alta' ? '🔴 Alta' : '🟡 Média'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{alerta.detalhe}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      {alerta.tipo === 'sem_upload' ? '📁 Upload' : '👤 Usuário'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── ABA ANÚNCIOS ─────────────────────────────────────────────── */}
      {tab === 'anuncios' && (
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
            <CardHeader title="Analytics de Comunicados" subtitle="Rastreio de abertura por comunicado publicado" />
          </div>

          {comunicados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MegaphoneIcon className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-3" />
              <p className="font-medium text-slate-700 dark:text-slate-300">Nenhum comunicado publicado</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Publique um comunicado para ver os dados de abertura.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {comunicados.map(com => {
                const pct = com.total_tenants > 0 ? Math.round((com.lidos / com.total_tenants) * 100) : 0
                return (
                  <div key={com.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{com.titulo}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatDistanceToNow(parseISO(com.created_at), { addSuffix: true, locale: ptBR })} ·{' '}
                          {format(parseISO(com.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 shrink-0">{pct}%</span>
                    </div>

                    {/* Barra de progresso */}
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>

                    {/* Contadores */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <EyeIcon className="h-3.5 w-3.5" />
                        <strong>{com.lidos}</strong> viram
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <EyeSlashIcon className="h-3.5 w-3.5" />
                        <strong>{com.nao_lidos}</strong> não viram
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">de {com.total_tenants} clientes</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── ABA CONFORMIDADE ─────────────────────────────────────────── */}
      {tab === 'conformidade' && (
        <div className="space-y-4">
          {/* Banner comprometidas */}
          {comprometidas.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-4">
              <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-400">
                  {comprometidas.length} franquia{comprometidas.length !== 1 ? 's' : ''} em situação COMPROMETIDA
                </p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-500">
                  Mais de 7 dias sem envio de arquivo de vendas.
                </p>
              </div>
            </div>
          )}

          {/* Tabela conformidade */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
              <CardHeader
                title="Monitor de Conformidade"
                subtitle={`${compliance.filter(c => c.compliance_status === 'OK').length} conformes · ${comprometidas.length} comprometidas`}
              />
              <Button variant="secondary" size="sm" loading={refreshing}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={() => loadAll(true)}>
                Atualizar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Franquia</th>
                    <th className="px-6 py-3">Código CP</th>
                    <th className="px-6 py-3">Último Upload</th>
                    <th className="px-6 py-3 text-right">Dias sem Upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {compliance.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
                      Nenhum dado disponível.
                    </td></tr>
                  ) : [...comprometidas, ...compliance.filter(c => c.compliance_status === 'OK')].map(c => (
                    <tr key={c.tenant_id}
                      className={`transition-colors ${c.compliance_status === 'COMPROMETIDO'
                        ? 'bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                      <td className="px-6 py-4">
                        {c.compliance_status === 'OK'
                          ? <span className="flex items-center gap-2"><span>🟢</span><span className="text-emerald-700 dark:text-emerald-400 font-medium">CONFORME</span></span>
                          : <span className="flex items-center gap-2"><span>🔴</span><span className="text-red-700 dark:text-red-400 font-medium">COMPROMETIDO</span></span>}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{c.tenant_name}</td>
                      <td className="px-6 py-4">
                        {(c as TenantCompliance & { codigo_cp?: string }).codigo_cp
                          ? <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{(c as TenantCompliance & { codigo_cp?: string }).codigo_cp}</span>
                          : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                        {c.last_upload_date
                          ? format(parseISO(c.last_upload_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : <span className="italic text-slate-400">Nunca realizou upload</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {c.days_since_upload !== null
                          ? <span className={`font-semibold ${c.days_since_upload > 7 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {c.days_since_upload}d
                            </span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Histórico uploads */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <CardHeader title="Histórico de Uploads" subtitle="Últimos 50 arquivos enviados" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-6 py-3">Franquia</th>
                    <th className="px-6 py-3">Arquivo</th>
                    <th className="px-6 py-3 text-right">Data do Upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {uploadLogs.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Nenhum upload registrado.</td></tr>
                  ) : uploadLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {(log.tenant as { nome_franquia?: string })?.nome_franquia ?? log.tenant_id}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 max-w-[240px] truncate">
                        {log.nome_arquivo}
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-500 dark:text-slate-400 text-xs">
                        {format(parseISO(log.data_upload), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
