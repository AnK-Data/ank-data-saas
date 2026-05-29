import { useEffect, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { License } from '../types'

export interface LicenseWithDays extends License {
  dias_restantes: number
}

export function useLicense() {
  const { profile } = useAuth()
  const [license, setLicense] = useState<LicenseWithDays | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.tenant_id) {
      setLicense(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    // Timeout de 10s: se Supabase não responder, libera sem bloquear
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[useLicense] timeout — liberando sem licença')
        setLicense(null)
        setLoading(false)
      }
    }, 10_000)

    supabase
      .from('licenses')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
      .then(({ data, error }) => {
        clearTimeout(timeout)
        if (cancelled) return
        if (!error && data) {
          const dias = differenceInDays(parseISO((data as License).data_fim_ciclo), new Date())
          setLicense({ ...(data as License), dias_restantes: dias })
        } else {
          if (error) console.warn('[useLicense]', error.message)
          setLicense(null)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [profile?.tenant_id])

  return { license, loading }
}
