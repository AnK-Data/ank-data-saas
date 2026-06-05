import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import FranchiseSidebar from '../../components/franqueado/FranchiseSidebar'
import FranchiseHeader from '../../components/franqueado/FranchiseHeader'
import LicenseAlertBanner from '../../components/franqueado/LicenseAlertBanner'
import LicenseAlertModal from '../../components/franqueado/LicenseAlertModal'
import AceiteTermosModal from '../../components/franqueado/AceiteTermosModal'
import { useTenantTheme } from '../../hooks/useTenantTheme'
import { useAuth } from '../../contexts/AuthContext'
import { isAnkRole } from '../../types'

const PAGE_TITLES: Record<string, string> = {
  '/franqueado':                'Dashboard',
  '/franqueado/upload':         'Upload de Arquivo de Vendas',
  '/franqueado/vendas':         'Análise de Vendas',
  '/franqueado/estoque':        'Gestão de Estoque',
  '/franqueado/financeiro':     'Controle Financeiro',
  '/franqueado/crm':            'CRM e Retenção',
  '/franqueado/configuracoes':   'Configuração Global',
  '/franqueado/configurar-menu': 'Configurar Menu',
  '/franqueado/lojas':           'Lojas / PDVs',
  '/franqueado/usuarios':        'Usuários da Franquia',
  '/franqueado/metas':           'Gestão de Metas',
  '/franqueado/comunicados':     'Comunicados',
  '/franqueado/notificacoes':    'Notificações',
}

export default function FranchiseLayout() {
  useTenantTheme()
  const { pathname }  = useLocation()
  const { profile }   = useAuth()
  const title         = PAGE_TITLES[pathname] ?? 'Painel Franqueado'

  useEffect(() => {
    document.title = `AnK Data — ${title}`
  }, [title])

  // Exibe modal de aceite quando:
  // 1. Usuário é franqueado (não é ANK Data)
  // 2. Ainda não aceitou os termos (lgpd_aceito_em é null)
  const [showAceite, setShowAceite] = useState(false)

  useEffect(() => {
    if (!profile) return
    const isAnk = isAnkRole(profile.papel)
    const jaAceitou = !!(profile as typeof profile & { lgpd_aceito_em?: string | null }).lgpd_aceito_em
    if (!isAnk && !jaAceitou) setShowAceite(true)
  }, [profile])

  return (
    <>
      <LicenseAlertModal />

      {/* Modal bloqueante de aceite LGPD — aparece uma única vez */}
      {showAceite && (
        <AceiteTermosModal onAceito={() => setShowAceite(false)} />
      )}

      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <FranchiseSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <LicenseAlertBanner />
          <FranchiseHeader pageTitle={title} />

          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
