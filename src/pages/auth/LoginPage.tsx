import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import AnkMascot from '../../components/AnkMascot'

const ADMIN_ROLES = ['ank_admin']

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const profile = await signIn(email, password)
      const dest = profile && ADMIN_ROLES.includes(profile.papel)
        ? '/admin-ank'
        : '/franqueado'
      navigate(dest, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Painel esquerdo ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[58%] relative flex-col items-center justify-center overflow-hidden select-none"
        style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 40%, #1d4ed8 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute top-0 left-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <AnkMascot height={260} className="drop-shadow-2xl mb-6" />
          <h1 className="text-3xl font-black text-white tracking-tight">
            ANK Data<span className="text-blue-300"> Insights</span>
          </h1>
          <p className="mt-2 text-base text-blue-200/70 max-w-xs leading-snug">
            Inteligência de dados para o varejo de cosméticos do Grupo Boticário
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {['Sell-Out', 'Estoque', 'CRM', 'Financeiro', 'Conformidade', 'IA'].map(m => (
              <span key={m} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-200 ring-1 ring-white/10">{m}</span>
            ))}
          </div>
        </div>
        <p className="absolute bottom-6 text-[11px] text-white/20 tracking-widest">
          © {new Date().getFullYear()} ANK Data — Plataforma SaaS Multi-Tenant
        </p>
      </div>

      {/* ── Painel direito ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <AnkMascot height={120} className="mb-3" />
            <h1 className="text-xl font-bold text-slate-900">ANK Data</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Acesse sua conta</h2>
            <p className="mt-1 text-sm text-slate-500">Painel ANK Data</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ width: 17, height: 17 }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@franquia.com.br" required autoComplete="email"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-ank-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ank-200 transition-colors" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ width: 17, height: 17 }} />
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className={`block w-full rounded-xl border bg-slate-50 pl-10 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-colors ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-200 focus:border-ank-400 focus:ring-ank-200'}`} />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeSlashIcon style={{ width: 17, height: 17 }} /> : <EyeIcon style={{ width: 17, height: 17 }} />}
                </button>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full !py-3 !text-sm !font-semibold !rounded-xl mt-2">
              {loading ? 'Validando…' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
            Acesso concedido pela equipe ANK Data.<br />
            <span className="text-slate-300">suporte@ankdata.com.br</span>
          </p>
        </div>
      </div>
    </div>
  )
}
