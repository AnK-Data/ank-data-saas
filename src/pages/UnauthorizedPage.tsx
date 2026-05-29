import { useNavigate } from 'react-router-dom'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'

export default function UnauthorizedPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
        <ShieldExclamationIcon className="h-8 w-8 text-amber-600" />
      </div>

      <h1 className="mb-2 text-2xl font-bold text-slate-900">Acesso Negado</h1>
      <p className="mb-8 max-w-sm text-center text-sm text-slate-500">
        Você não tem permissão para acessar esta área. Esta seção é restrita
        a administradores internos da ANK Data.
      </p>

      <Button variant="secondary" onClick={handleSignOut}>
        Sair da conta
      </Button>
    </div>
  )
}
