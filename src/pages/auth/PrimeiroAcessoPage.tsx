import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabaseClient'
import {
  checkIngresseColaborador, buildInternalEmail,
} from '../../services/ingresse.service'
import AnkLogo from '../../components/AnkLogo'

export default function PrimeiroAcessoPage() {
  const navigate         = useNavigate()
  const [params]         = useSearchParams()

  const [ingresseId, setIngresseId]   = useState(params.get('id') ?? '')
  const [colaborador, setColaborador] = useState<{ nome: string; cargo: string | null; tenant_id: string } | null>(null)
  const [checking, setChecking]       = useState(false)
  const [checked, setChecked]         = useState(false)

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // Auto-verificar se vier da URL com ?id=
  useEffect(() => {
    if (ingresseId && !checked) verifyId()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyId() {
    if (!ingresseId.trim()) return
    setChecking(true); setError('')
    try {
      const result = await checkIngresseColaborador(ingresseId.trim())
      if (!result) {
        setError('Usuário Ingresse não encontrado ou inativo. Verifique o ID com o administrador.')
        setChecked(false)
      } else {
        setColaborador({ nome: result.nome, cargo: result.cargo, tenant_id: result.tenant_id })
        setChecked(true)
      }
    } catch {
      setError('Erro ao verificar usuário. Tente novamente.')
    } finally {
      setChecking(false)
    }
  }

  async function handleCreatePassword(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.'); return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.'); return
    }
    if (!aceitouTermos) {
      setError('Você precisa aceitar a Política de Privacidade para continuar.'); return
    }
    if (!colaborador) return

    setSaving(true)
    try {
      const internalEmail = buildInternalEmail(ingresseId.trim())

      // Tenta criar a conta (signUp com email interno)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: { data: { full_name: colaborador.nome } },
      })

      if (signUpError) {
        // Usuário já existe → tenta redefinir com updateUser (já autenticado)
        if (signUpError.message.includes('already') || signUpError.message.includes('registered')) {
          throw new Error('Conta já criada. Use a tela de login com seu Ingresse ID e senha.')
        }
        throw signUpError
      }

      if (!signUpData.user) throw new Error('Falha ao criar conta.')

      // Aguarda propagação no DB
      await new Promise(r => setTimeout(r, 800))

      // Atualiza o perfil com dados do Ingresse
      await supabase.from('profiles').update({
        nome:               colaborador.nome,
        usuario_extranet:   ingresseId.trim(),
        tenant_id:          colaborador.tenant_id,
        cargo_ingresse:     colaborador.cargo,
        tipo_usuario:       'ingresse',
        status:             'Ativo',
        first_access:       false,
        lgpd_aceito_em:     new Date().toISOString(),
        lgpd_versao:        '1.0',
      }).eq('id', signUpData.user.id)

      toast.success('Senha criada! Bem-vindo(a) à plataforma.')
      navigate('/franqueado', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar senha.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <AnkLogo height={60} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Primeiro Acesso</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Colaboradores Boticário — crie sua senha de acesso à plataforma AnK Data
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6">

          {/* Etapa 1 — Verificar ID */}
          {!checked ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Seu usuário Ingresse
                </label>
                <input
                  type="text"
                  value={ingresseId}
                  onChange={e => setIngresseId(e.target.value)}
                  placeholder="ex: ankdata26"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm focus:border-ank-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ank-200 transition-colors"
                />
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  É o mesmo login que você usa na Extranet Boticário
                </p>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={verifyId}
                disabled={checking || !ingresseId.trim()}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {checking ? 'Verificando…' : 'Verificar meu usuário'}
              </button>
            </div>
          ) : (
            // Etapa 2 — Criar senha
            <form onSubmit={handleCreatePassword} className="space-y-5">
              {/* Confirmação do usuário */}
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">{colaborador?.nome}</p>
                  {colaborador?.cargo && (
                    <p className="text-xs text-emerald-600">{colaborador.cargo}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setChecked(false); setColaborador(null); setError('') }}
                  className="ml-auto text-xs text-emerald-600 hover:underline"
                >
                  Trocar
                </button>
              </div>

              {/* Nova senha */}
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

              {/* Confirmar senha */}
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

              {/* Aceite LGPD */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={aceitouTermos}
                  onChange={e => setAceitouTermos(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-slate-900 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Li e aceito a{' '}
                  <a href="/privacidade" target="_blank"
                    className="text-ank-600 dark:text-ank-400 underline hover:no-underline">
                    Política de Privacidade
                  </a>
                  {' '}e o tratamento dos meus dados pessoais (nome, CPF, cargo) pela AnK Data
                  conforme a{' '}
                  <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
                    target="_blank" rel="noopener noreferrer"
                    className="text-ank-600 dark:text-ank-400 underline hover:no-underline">
                    LGPD (Lei 13.709/2018)
                  </a>.
                </span>
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !aceitouTermos}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Criando conta…' : 'Criar senha e acessar'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Já tem senha?{' '}
            <button onClick={() => navigate('/login')} className="text-ank-600 hover:underline font-medium">
              Ir para o login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
