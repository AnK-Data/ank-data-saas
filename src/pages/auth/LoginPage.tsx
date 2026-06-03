import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon,
  UserCircleIcon, BuildingStorefrontIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import AnkMascot from '../../components/AnkMascot'
import AnkLogo from '../../components/AnkLogo'
import { isAnkRole } from '../../types'

type Mode = 'ingresse' | 'email'

export default function LoginPage() {
  const { signIn, signInIngresse } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]           = useState<Mode>('ingresse')
  const [identifier, setId]       = useState('')  // ingresse_id OU email
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'ingresse') {
        const result = await signInIngresse(identifier, password)
        if (result.firstAccess) {
          navigate(`/primeiro-acesso?id=${encodeURIComponent(identifier)}`, { replace: true })
          return
        }
        navigate('/franqueado', { replace: true })
      } else {
        const result = await signIn(identifier, password)
        const dest = result.profile && isAnkRole(result.profile.papel)
          ? '/admin-ank'
          : '/franqueado'
        if (result.firstAccess) {
          navigate('/redefinir-senha', { replace: true })
          return
        }
        navigate(dest, { replace: true })
      }
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
        style={{ background: 'linear-gradient(145deg, #1e2024 0%, #32343A 50%, #3d4047 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute top-0 left-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <AnkLogo variant="light" height={200} className="mb-8 drop-shadow-2xl" />
          <p className="text-base text-white/50 max-w-xs leading-snug text-center">
            Inteligência de dados para o varejo de cosméticos do Grupo Boticário
          </p>
          <AnkMascot height={200} className="mt-6 drop-shadow-xl opacity-80" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Sell-Out', 'Estoque', 'CRM', 'Financeiro', 'Conformidade', 'IA'].map(m => (
              <span key={m} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60 ring-1 ring-white/10">{m}</span>
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

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Acesse sua conta</h2>
            <p className="mt-1 text-sm text-slate-500">Painel ANK Data</p>
          </div>

          {/* ── Toggle de modo ──────────────────────────────────────── */}
          <div className="mb-6 flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode('ingresse'); setId(''); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors
                ${mode === 'ingresse'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <BuildingStorefrontIcon className="h-4 w-4" />
              Colaborador GB
            </button>
            <button
              type="button"
              onClick={() => { setMode('email'); setId(''); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-l border-slate-200
                ${mode === 'email'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <UserCircleIcon className="h-4 w-4" />
              ANK / Prestador
            </button>
          </div>

          {/* ── Dica contextual ─────────────────────────────────────── */}
          {mode === 'ingresse' ? (
            <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 ring-1 ring-blue-100">
              Use o <strong>login Ingresse</strong> (ex: <em>ankdata26</em>)
            </p>
          ) : (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
              Acesso exclusivo para <strong>equipe ANK Data</strong> e <strong>prestadores PJ</strong>
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identificador */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                {mode === 'ingresse' ? 'Usuário Ingresse' : 'E-mail'}
              </label>
              <div className="relative">
                {mode === 'ingresse'
                  ? <BuildingStorefrontIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ width: 17, height: 17 }} />
                  : <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ width: 17, height: 17 }} />
                }
                <input
                  type={mode === 'ingresse' ? 'text' : 'email'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={mode === 'ingresse' ? 'ex: ankdata26' : 'usuario@ankdata.com.br'}
                  required autoComplete={mode === 'ingresse' ? 'username' : 'email'}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-ank-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ank-200 transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ width: 17, height: 17 }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className={`block w-full rounded-xl border bg-slate-50 pl-10 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-colors ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-200 focus:border-ank-400 focus:ring-ank-200'}`}
                />
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

          {/* Primeiro acesso */}
          {mode === 'ingresse' && (
            <div className="mt-5 text-center">
              <span className="text-xs text-slate-400">Primeiro acesso? </span>
              <button type="button" onClick={() => navigate('/primeiro-acesso')}
                className="text-xs font-medium text-ank-600 hover:text-ank-700 underline">
                Criar senha
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
            Acesso concedido pela equipe ANK Data.<br />
            <span className="text-slate-300">suporte@ankdata.com.br</span>
          </p>
        </div>
      </div>
    </div>
  )

  function setIdentifier(val: string) { setId(val) }
}
