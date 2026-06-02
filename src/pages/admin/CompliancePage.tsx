import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { ComplianceService } from '../../services/compliance.service'
import { TenantsService } from '../../services/tenants.service'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import type { TenantCompliance, UploadLog, Tenant } from '../../types'

type UploadRow = UploadLog & { tenant?: { id: string; name: string } }

export default function CompliancePage() {
  const [compliance, setCompliance] = useState<TenantCompliance[]>([])
  const [logs, setLogs]             = useState<UploadRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const [complianceRes, logsRes, tenantsRes] = await Promise.all([
      ComplianceService.check(),
      ComplianceService.recentLogs(50),
      TenantsService.list(),
    ])

    if (complianceRes.error) {
      toast.error('Erro ao carregar dados de conformidade.')
    } else {
      const tenantMap = new Map(
        ((tenantsRes.data ?? []) as Tenant[]).map(t => [t.id, t])
      )
      const merged = ((complianceRes.data ?? []) as TenantCompliance[]).map(c => ({
        ...c,
        codigo_cp: tenantMap.get(c.tenant_id)?.codigo_cp ?? null,
      }))
      setCompliance(merged)
    }

    if (!logsRes.error && logsRes.data) {
      setLogs(logsRes.data as UploadRow[])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const compromised = compliance.filter(c => c.compliance_status === 'COMPROMETIDO')
  const ok          = compliance.filter(c => c.compliance_status === 'OK')

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-6">
      {/* Banner de alerta */}
      {compromised.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {compromised.length} franquia{compromised.length !== 1 ? 's' : ''} em situação COMPROMETIDA
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              Mais de 7 dias sem envio de arquivo de vendas.
            </p>
          </div>
        </div>
      )}

      {/* Tabela de conformidade */}
      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100">
          <CardHeader
            title="Monitor de Conformidade"
            subtitle={`${ok.length} conforme${ok.length !== 1 ? 's' : ''} · ${compromised.length} comprometida${compromised.length !== 1 ? 's' : ''}`}
            action={
              <Button
                variant="secondary" size="sm" loading={refreshing}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={() => load(true)}
              >
                Atualizar
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Nome da Franquia</th>
                <th className="px-6 py-3">Código CP</th>
                <th className="px-6 py-3">Último Upload</th>
                <th className="px-6 py-3 text-right">Dias sem Upload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compliance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Nenhum dado de conformidade disponível.
                  </td>
                </tr>
              ) : (
                [...compromised, ...ok].map(c => (
                  <tr
                    key={c.tenant_id}
                    className={`transition-colors ${
                      c.compliance_status === 'COMPROMETIDO'
                        ? 'bg-red-50/40 hover:bg-red-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {c.compliance_status === 'OK'
                          ? <><span className="text-lg">🟢</span><span className="text-emerald-700">CONFORME</span></>
                          : <><span className="text-lg">🔴</span><span className="text-red-700">COMPROMETIDO</span></>
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{c.tenant_name}</td>
                    <td className="px-6 py-4">
                      {c.codigo_cp
                        ? <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{c.codigo_cp}</span>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {c.last_upload_date
                        ? format(parseISO(c.last_upload_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : <span className="italic text-slate-400">Nunca realizou upload</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.days_since_upload !== null
                        ? <span className={`font-semibold ${c.days_since_upload > 7 ? 'text-red-600' : 'text-slate-700'}`}>
                            {c.days_since_upload}d
                          </span>
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Histórico de uploads */}
      <Card padding={false}>
        <div className="px-6 py-5 border-b border-slate-100">
          <CardHeader
            title="Histórico de Uploads"
            subtitle="Últimos 50 arquivos enviados"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-3">Franquia</th>
                <th className="px-6 py-3">Arquivo</th>
                <th className="px-6 py-3 text-right">Data do Upload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                    Nenhum upload registrado.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      {log.tenant?.nome_franquia ?? log.tenant_id}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600 max-w-[240px] truncate">
                      {log.nome_arquivo}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500 text-xs">
                      {format(parseISO(log.data_upload), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
