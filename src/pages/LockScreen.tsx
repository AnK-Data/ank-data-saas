import { useNavigate } from 'react-router-dom'
import { LockClosedIcon, PhoneIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'

/**
 * Full-page block screen shown when a franchise's license is expired or suspended.
 * No navigation out — the only action is signing out.
 */
export default function LockScreen() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-6 text-white">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/40">
        <LockClosedIcon className="h-10 w-10 text-red-400" />
      </div>

      {/* Message */}
      <h1 className="mb-2 text-center text-2xl font-bold">Acesso Bloqueado</h1>
      <p className="mb-1 text-center text-base text-white/70">
        {profile?.nome
          ? `Olá, ${profile.nome}.`
          : 'Acesso restrito.'}
      </p>
      <p className="mb-8 max-w-sm text-center text-sm text-white/50">
        O período de licença da sua franquia expirou ou foi suspenso.
        Entre em contato com a equipe AnK Data para regularizar sua situação.
      </p>

      {/* Contact */}
      <div className="mb-8 flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3">
        <PhoneIcon className="h-4 w-4 text-white/60" />
        <span className="text-sm text-white/80 font-medium">suporte@ankdata.com.br</span>
      </div>

      {/* Sign out — only action allowed */}
      <Button variant="secondary" onClick={handleSignOut}>
        Sair da conta
      </Button>

      {/* Visual watermark */}
      <p className="mt-12 text-xs text-white/20 tracking-widest uppercase">
        AnK Data — Sistema de Gestão de Franquias
      </p>
    </div>
  )
}
