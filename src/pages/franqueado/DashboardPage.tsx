import { useEffect, useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CloudArrowUpIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useLicense } from '../../hooks/useLicense'
import Card from '../../components/ui/Card'
import { LicenseBadge } from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import type { UploadLog } from '../../types'

type UploadRow = UploadLog & { tenant?: { nome_franquia: string } }

interface DashStats {
  totalUploads: number
  lastUpload: string | null
  diasSemUpload: number | null
  conformidade: 'OK' | 'COMPROMETIDO' | 'SEM_DADOS'
}

export default function FranqueadoDashboardPage() {
  const { profile } = useAuth()
  const { license } = useLicense()
  const [stats, setStats]   = useState<DashStats | null>(null)
  const [logs, setLogs]     = useState<UploadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.tenant_id) { setLoading(false); return }

    async function load() {
      const [logsRes, countRes] = await Promise.all([
        supabase
          .from('upload_logs')
          .select('*')
          .eq('tenant_id', profile!.tenant_id)
          .order('data_upload', { ascending: false })
          .limit(10),
        supabase
          .from('upload_logs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', profile!.tenant_id),
      ])

      const uploadList = (logsRes.data ?? []) as UploadRow[]
      setLogs(uploadList)

      const lastUpload = uploadList[0]?.data_upload ?? null
      const diasSemUpload = lastUpload
        ? differenceInDays(new Date(), parseISO(lastUpload))
        : null

      setStats({
        totalUploads: countRes.count ?? 0,
        lastUpload,
        diasSemUpload,
        conformidade: diasSemUpload === null
          ? 'SEM_DADOS'
          : diasSemUpload > 7 ? 'COMPROMETIDO' : 'OK',
      })
      setLoading(false)
    }

    load()
  }, [profile?.tenant_id])

  if (loading) return <Spinner fullScreen />

  const diasLicenca = license
    ? differenceInDays(parseISO(license.data_fim_ciclo), new Date())
    : null

  return (
    <div className="space-y-6">
      {/* ── Cards de KPI ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Total uploads */}
        <Card>
          <div className="mb-3 inline-flex rounded-lg p-2.5 bg-ank-50">
            <CloudArrowUpIcon className="h-6 w-6 text-ank-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalUploads ?? 0}</p>
          <p className="mt-0.5 text-sm text-slate-500">Uploads realizados</p>
        </Card>

        {/* Último upload */}
        <Card>
          <div className="mb-3 inline-flex rounded-lg p-2.5 bg-slate-50">
            <ClockIcon className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-lg font-bold text-slate-900">
            {stats?.lastUpload
              ? format(parseISO(stats.lastUpload), 'dd/MM/yyyy', { locale: ptBR })
              : '—'
            }
          </p>
          <p className="mt-0.5 text-sm text-slate-500">Último upload</p>
        </Card>

        {/* Conformidade */}
        <Card>
          <div className={`mb-3 inline-flex rounded-lg p-2.5
            ${stats?.conformidade === 'OK' ? 'bg-emerald-50' :
              stats?.conformidade === 'COMPROMETIDO' ? 'bg-red-50' : 'bg-slate-50'}`}>
            {stats?.conformidade === 'OK'
              ? <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
              : <ExclamationTriangleIcon className={`h-6 w-6 ${stats?.conformidade === 'COMPROMETIDO' ? 'text-red-500' : 'text-slate-400'}`} />
            }
          </div>
          <p className={`text-lg font-bold
            ${stats?.conformidade === 'OK' ? 'text-emerald-700' :
              stats?.conformidade === 'COMPROMETIDO' ? 'text-red-700' : 'text-slate-500'}`}>
            {stats?.conformidade === 'OK' ? '🟢 CONFORME'
              : stats?.conformidade === 'COMPROMETIDO' ? '🔴 COMPROMETIDO'
              : '—'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {stats?.diasSemUpload != null
              ? `${stats.diasSemUpload}d sem upload`
              : 'Nenhum upload'}
          </p>
        </Card>

        {/* Licença */}
        <Card>
          <div className="mb-3">
            {license && <LicenseBadge status={license.status} />}
          </div>
          <p className={`text-2xl font-bold ${diasLicenca !== null && diasLicenca <= 7 ? 'text-red-600' : 'text-slate-900'}`}>
            {diasLicenca !== null ? `${diasLicenca}d` : '—'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">Dias de licença</p>
        </Card>
      </div>

      {/* ── Histórico de uploads ──────────────────────────────────────── */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Histórico de Uploads</h2>
            <p className="text-xs text-slate-500 mt-0.5">Últimos 10 arquivos enviados</p>
          </div>
          <Link to="/franqueado/upload"
            className="text-sm font-medium text-ank-600 hover:text-ank-700 transition-colors">
            Novo Upload →
          </Link>
        </div>

        {logs.length === 0 ? (
          /* ── Empty state com CTA ─────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ank-50">
              <CloudArrowUpIcon className="h-8 w-8 text-ank-500" />
            </div>
            <p className="text-base font-semibold text-slate-700 mb-1">Nenhum arquivo enviado ainda</p>
            <p className="text-sm text-slate-400 max-w-xs mb-5">
              Faça o upload do seu primeiro arquivo de vendas para começar a ver os indicadores do seu PDV.
            </p>
            <Link to="/franqueado/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-ank-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ank-700 transition-colors">
              <CloudArrowUpIcon className="h-4 w-4" />
              Fazer primeiro upload
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Arquivo</th>
                  <th className="px-6 py-3 text-right">Data do Upload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-700">{log.nome_arquivo}</td>
                    <td className="px-6 py-3.5 text-right text-slate-500 text-xs">
                      {format(parseISO(log.data_upload), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Módulos disponíveis (preview) ────────────────────────────── */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { to: '/franqueado/vendas',     label: 'Análise de Vendas',    emoji: '📊', color: 'bg-blue-50 text-blue-700' },
            { to: '/franqueado/estoque',    label: 'Gestão de Estoque',    emoji: '📦', color: 'bg-emerald-50 text-emerald-700' },
            { to: '/franqueado/financeiro', label: 'Financeiro',           emoji: '💰', color: 'bg-amber-50 text-amber-700' },
            { to: '/franqueado/crm',        label: 'CRM e Retenção',       emoji: '👥', color: 'bg-violet-50 text-violet-700' },
          ].map(mod => (
            <Link key={mod.to} to={mod.to}
              className={`flex items-center gap-3 rounded-xl p-4 ${mod.color} hover:opacity-80 transition-opacity`}>
              <span className="text-2xl">{mod.emoji}</span>
              <span className="text-sm font-semibold">{mod.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
