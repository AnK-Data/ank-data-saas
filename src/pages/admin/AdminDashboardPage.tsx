import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import {
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabaseClient'
import Card, { CardHeader } from '../../components/ui/Card'
import { LicenseBadge, ComplianceBadge } from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import type { License, TenantCompliance, UploadLog } from '../../types'

interface Stats {
  totalTenants: number
  activeLicenses: number
  expiringLicenses: number
  compromisedTenants: number
}

interface RecentActivity {
  expiringLicenses: (License & { tenant?: { name: string } })[]
  recentUploads: (UploadLog & { tenant?: { name: string } })[]
  compliance: TenantCompliance[]
}

export default function AdminDashboardPage() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [activity, setActivity] = useState<RecentActivity | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Queries independentes para isolar falhas individuais
        const tenantsRes   = await supabase.from('tenants').select('*', { count: 'exact', head: true })
        const licensesRes  = await supabase.from('licenses').select('*, tenant:tenants(id, nome_franquia)')
        const uploadsRes   = await supabase
          .from('upload_logs')
          .select('*, tenant:tenants(id, nome_franquia)')
          .order('data_upload', { ascending: false })
          .limit(8)
        // check_tenant_compliance pode não existir ainda — falha silenciosa
        const complianceRes = await supabase.rpc('check_tenant_compliance').then(
          r => r,
          () => ({ data: null, error: null }),
        )

        const now         = new Date()
        const licenseList = ((licensesRes.data ?? []) as (License & { tenant?: { name: string } })[])

        const activeLicenses    = licenseList.filter(l => l.status === 'ACTIVE').length
        const expiringLicenses  = licenseList.filter(l => {
          if (l.status !== 'ACTIVE' && l.status !== 'ALERT') return false
          const days = differenceInDays(parseISO(l.data_fim_ciclo), now)
          return days >= 0 && days <= 30
        })
        const compromisedList = ((complianceRes.data ?? []) as TenantCompliance[]).filter(
          c => c.compliance_status === 'COMPROMETIDO',
        )

        setStats({
          totalTenants:       tenantsRes.count ?? 0,
          activeLicenses,
          expiringLicenses:   expiringLicenses.length,
          compromisedTenants: compromisedList.length,
        })

        setActivity({
          expiringLicenses: expiringLicenses.slice(0, 5),
          recentUploads:    ((uploadsRes.data ?? []) as (UploadLog & { tenant?: { name: string } })[]),
          compliance:       compromisedList.slice(0, 5),
        })
      } catch (err) {
        console.error('[Dashboard] Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-6">
      {/* ── Stats grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<BuildingStorefrontIcon className="h-6 w-6 text-ank-600" />}
          label="Total de Franquias"
          value={stats?.totalTenants ?? 0}
          bg="bg-ank-50"
        />
        <StatCard
          icon={<CheckCircleIcon className="h-6 w-6 text-emerald-600" />}
          label="Licenças Ativas"
          value={stats?.activeLicenses ?? 0}
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />}
          label="Expirando (30 dias)"
          value={stats?.expiringLicenses ?? 0}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<XCircleIcon className="h-6 w-6 text-red-600" />}
          label="Franquias Comprometidas"
          value={stats?.compromisedTenants ?? 0}
          bg="bg-red-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Expiring licenses ───────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Licenças Expirando em Breve"
            subtitle="Próximos 30 dias"
            action={
              <Link
                to="/admin-ank/licenses"
                className="flex items-center gap-1 text-xs font-medium text-ank-600 hover:text-ank-700"
              >
                Ver todas <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-4">
            {activity?.expiringLicenses.length === 0 ? (
              <EmptyRow message="Nenhuma licença expirando nos próximos 30 dias." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60 text-left text-xs text-slate-500">
                    <th className="pb-2 font-medium">Franquia</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Dias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activity?.expiringLicenses.map(l => (
                    <tr key={l.id}>
                      <td className="py-2.5 font-medium text-slate-800">
                        {l.tenant?.nome_franquia ?? l.tenant_id}
                      </td>
                      <td className="py-2.5"><LicenseBadge status={l.status} /></td>
                      <td className="py-2.5 text-right text-slate-600">
                        {differenceInDays(parseISO(l.data_fim_ciclo), new Date())}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* ── Compliance issues ───────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Franquias Comprometidas"
            subtitle="Sem upload há mais de 7 dias"
            action={
              <Link
                to="/admin-ank/compliance"
                className="flex items-center gap-1 text-xs font-medium text-ank-600 hover:text-ank-700"
              >
                Ver monitor <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-4">
            {activity?.compliance.length === 0 ? (
              <EmptyRow message="Todas as franquias estão em conformidade." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60 text-left text-xs text-slate-500">
                    <th className="pb-2 font-medium">Franquia</th>
                    <th className="pb-2 font-medium text-right">Dias sem upload</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activity?.compliance.map(c => (
                    <tr key={c.tenant_id}>
                      <td className="py-2.5 font-medium text-slate-800">{c.tenant_name}</td>
                      <td className="py-2.5 text-right text-slate-600">
                        {c.days_since_upload ?? '—'}d
                      </td>
                      <td className="py-2.5 text-right">
                        <ComplianceBadge status={c.compliance_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: ReactNode
  label: string
  value: number
  bg: string
}) {
  return (
    <Card>
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${bg}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
    </Card>
  )
}

function EmptyRow({ message }: { message: string }) {
  return (
    <p className="py-4 text-center text-sm text-slate-400">{message}</p>
  )
}
