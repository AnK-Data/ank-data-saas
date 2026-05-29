import { useNavigate } from 'react-router-dom'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import { useLicense } from '../../hooks/useLicense'
import { differenceInDays, parseISO } from 'date-fns'

interface FranchiseHeaderProps {
  pageTitle: string
}

export default function FranchiseHeader({ pageTitle }: FranchiseHeaderProps) {
  const { profile, signOut } = useAuth()
  const { license } = useLicense()
  const navigate = useNavigate()

  async function handleSignOut() {
    try { await signOut(); navigate('/login', { replace: true }) }
    catch { toast.error('Erro ao sair.') }
  }

  const dias = license ? differenceInDays(parseISO(license.data_fim_ciclo), new Date()) : null

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>

      <div className="flex items-center gap-4">
        {/* Badge de dias restantes */}
        {dias !== null && dias <= 30 && dias >= 0 && (
          <span className={`hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
            ${dias <= 7 ? 'bg-red-50 text-red-700 ring-red-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}`}>
            {dias}d restante{dias !== 1 ? 's' : ''}
          </span>
        )}

        {/* Usuário */}
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-slate-800">{profile?.nome ?? '—'}</span>
          <span className="text-xs text-slate-500 capitalize">{
            profile?.papel === 'admin_franquia' ? 'Admin Franquia' :
            profile?.papel === 'gerente' ? 'Gerente' :
            profile?.papel === 'vendedor' ? 'Vendedor' : 'Controller'
          }</span>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-semibold text-sm uppercase select-none">
          {(profile?.nome ?? 'F').charAt(0)}
        </div>

        <Button variant="ghost" size="sm" onClick={handleSignOut}
          leftIcon={<ArrowRightStartOnRectangleIcon className="h-4 w-4" />}>
          Sair
        </Button>
      </div>
    </header>
  )
}
