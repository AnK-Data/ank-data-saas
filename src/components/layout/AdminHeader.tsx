import { useAuth } from '../../contexts/AuthContext'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface AdminHeaderProps {
  pageTitle: string
}

export default function AdminHeader({ pageTitle }: AdminHeaderProps) {
  const { profile, signOut } = useAuth()

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>

      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-slate-800">
            {profile?.nome ?? '—'}
          </span>
          <span className="text-xs text-slate-500 capitalize">
            {profile?.papel === 'ank_admin' ? 'Administrador ANK' : profile?.papel ?? ''}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ank-100 text-ank-700 font-semibold text-sm uppercase select-none">
          {(profile?.nome ?? 'A').charAt(0)}
        </div>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          leftIcon={<ArrowRightStartOnRectangleIcon className="h-4 w-4" />}
        >
          Sair
        </Button>
      </div>
    </header>
  )
}
