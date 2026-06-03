import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import AnkLogo from '../../components/AnkLogo'

export default function RedefinirSenhaPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.'); return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.'); return
    }

    setSaving(true)
    try {
      // Atualiza a senha no Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({ password })
      if (authErr) throw authErr

      // Marca first_access = false no perfil
      if (user) {
        await supabase.from('profiles').update({ first_access: false }).eq('id', user.id)
        await refreshProfile()
      }

      toast.success('Senha redefinida com sucesso!')

      // Redireciona para o painel correto
      const dest = profile?.papel && ['ank_admin', 'ank_suporte', 'ank_comercial', 'ank_financeiro', 'ank_tech'].includes(profile.papel)
        ? '/admin-ank'
        : '/franqueado'
      navigate(dest, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao redefinir senha.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <AnkLogo height={60} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Defina sua senha</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {profile?.nome ? `Olá, ${profile.nome.split(' ')[0]}! ` : ''}
            Por segurança, crie uma senha pessoal para continuar.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nova senha</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ width: 17, height: 17 }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 py-3 text-sm focus:border-ank-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ank-200 transition-colors"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeSlashIcon style={{ width: 17, height: 17 }} /> : <EyeIcon style={{ width: 17, height: 17 }} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar senha</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ width: 17, height: 17 }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha" required
                  className={`block w-full rounded-xl border bg-slate-50 pl-10 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-colors ${confirm && confirm !== password ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-ank-400 focus:ring-ank-200'}`}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Salvando…' : 'Definir senha e acessar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
