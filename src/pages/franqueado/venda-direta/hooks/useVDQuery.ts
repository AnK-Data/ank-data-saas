import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { supabase } from '../../../../lib/supabaseClient'
import type { VDQueryType, VDFilters } from '../../../../types'

function lsKey(tenantId: string, qt: VDQueryType, f: VDFilters, page: number): string {
  const fStr = (Object.entries(f) as [string, string | undefined][])
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `vdq_v1:${tenantId}:${qt}:${fStr}:${page}`
}

interface UseVDQueryOptions {
  queryType: VDQueryType
  filters?: VDFilters
  page?: number
  pageSize?: number
  enabled?: boolean
}

interface UseVDQueryResult<T> {
  data: T | null
  loading: boolean      // no data at all — show full-page spinner
  refreshing: boolean   // have stale data — show subtle "atualizando" badge
  error: string | null
  refetch: () => void
}

export function useVDQuery<T = unknown>({
  queryType,
  filters = {},
  page = 0,
  pageSize = 50,
  enabled = true,
}: UseVDQueryOptions): UseVDQueryResult<T> {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id

  const [data,       setData]       = useState<T | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const tickRef     = useRef(0)
  const inFlightRef = useRef(false)

  const doFetch = useCallback(async () => {
    if (!tenantId || !enabled) return
    if (inFlightRef.current) return
    inFlightRef.current = true
    const tick = ++tickRef.current

    // Show stale data immediately while fetching fresh
    const key = lsKey(tenantId, queryType, filters, page)
    let stale: T | null = null
    try {
      const raw = localStorage.getItem(key)
      stale = raw ? (JSON.parse(raw) as T) : null
    } catch { /* ignore */ }

    if (stale) {
      setData(stale)
      setRefreshing(true)
      setLoading(false)
    } else {
      setLoading(true)
      setRefreshing(false)
    }
    setError(null)

    try {
      const { data: raw, error: fnErr } = await supabase.functions.invoke(
        'drive-parquet-query',
        { body: { tenant_id: tenantId, query_type: queryType, filters, page, page_size: pageSize } }
      )

      if (tick !== tickRef.current) return

      if (fnErr) { setError(fnErr.message ?? 'Erro na consulta.'); return }
      if (raw?.error) { setError(raw.error as string); return }

      setData(raw as T)
      setRefreshing(false)
      try { localStorage.setItem(key, JSON.stringify(raw)) } catch { /* quota exceeded */ }
    } finally {
      inFlightRef.current = false
      if (tick === tickRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [tenantId, queryType, JSON.stringify(filters), page, pageSize, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { doFetch() }, [doFetch])

  return { data, loading, refreshing, error, refetch: doFetch }
}
