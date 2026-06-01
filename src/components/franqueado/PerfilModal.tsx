import { useState, useRef, useEffect, type FormEvent } from 'react'
import {
  CameraIcon, XMarkIcon, CheckCircleIcon,
  LockClosedIcon, EnvelopeIcon, UserCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

type Tab = 'perfil' | 'senha' | 'email'

const MAX_SIZE_MB = 2
const MAX_BYTES   = MAX_SIZE_MB * 1024 * 1024
const ACCEPTED    = 'image/jpeg,image/png,image/webp,image/gif'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PerfilModalProps {
  open: boolean
  onClose: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PerfilModal({ open, onClose }: PerfilModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState<Tab>('perfil')

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900
          shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Meu Perfil
            </h2>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 mt-4 px-6">
            {([
              ['perfil', <UserCircleIcon className="h-4 w-4" />, 'Dados'],
              ['senha',  <LockClosedIcon  className="h-4 w-4" />, 'Senha'],
              ['email',  <EnvelopeIcon    className="h-4 w-4" />, 'E-mail'],
            ] as [Tab, React.ReactNode, string][]).map(([id, icon, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                  ${tab === id
                    ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div className="px-6 py-5">
            {tab === 'perfil' && (
              <PerfilTab user={user} profile={profile} onSaved={async () => { await refreshProfile(); onClose() }} />
            )}
            {tab === 'senha' && (
              <SenhaTab onSaved={() => { toast.success('Senha alterada! Faça login novamente.'); onClose() }} />
            )}
            {tab === 'email' && (
              <EmailTab currentEmail={user?.email ?? ''} onSaved={onClose} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Aba: Dados do perfil ─────────────────────────────────────────────────────

function PerfilTab({ user, profile, onSaved }: {
  user: ReturnType<typeof useAuth>['user']
  profile: ReturnType<typeof useAuth>['profile']
  onSaved: () => void
}) {
  const [nome, setNome]         = useState(profile?.nome ?? '')
  const [telefone, setTelefone] = useState((profile as { telefone?: string } | null)?.telefone ?? '')
  const [avatarUrl, setAvatarUrl] = useState((profile as { avatar_url?: string } | null)?.avatar_url ?? '')
  const [preview, setPreview]   = useState<string | null>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [saving, setSaving]     = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNome(profile?.nome ?? '')
    setTelefone((profile as { telefone?: string } | null)?.telefone ?? '')
    setAvatarUrl((profile as { avatar_url?: string } | null)?.avatar_url ?? '')
    setPreview(null); setFile(null)
  }, [profile])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BYTES) {
      setUploadErr(`Foto muito pesada (${(f.size / 1024 / 1024).toFixed(1)}MB). Máximo ${MAX_SIZE_MB}MB.`)
      return
    }
    setUploadErr('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Nome obrigatório.'); return }
    setSaving(true)
    try {
      let finalAvatarUrl = avatarUrl

      // Upload da foto
      if (file && user?.id) {
        const ext  = file.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) throw upErr

        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        finalAvatarUrl = `${data.publicUrl}?t=${Date.now()}`
      }

      // Atualiza perfil
      const { error } = await supabase
        .from('profiles')
        .update({ nome: nome.trim(), avatar_url: finalAvatarUrl, telefone: telefone.trim() || null })
        .eq('id', user?.id)

      if (error) throw error
      toast.success('Perfil atualizado!')
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const displayAvatar = preview ?? (avatarUrl || null)
  const initials = (profile?.nome ?? 'U').charAt(0).toUpperCase()

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-20 w-20 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700">
            {displayAvatar
              ? <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
              : <div className="h-full w-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center
                  text-3xl font-bold text-violet-700 dark:text-violet-400">
                  {initials}
                </div>
            }
          </div>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full
              bg-ank-600 text-white shadow-lg hover:bg-ank-700 transition-colors">
            <CameraIcon className="h-3.5 w-3.5" />
          </button>
          <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
        </div>
        <div className="text-center">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-ank-600 dark:text-ank-400 hover:underline">
            Alterar foto
          </button>
          <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP ou GIF · Máx. {MAX_SIZE_MB}MB</p>
          {uploadErr && <p className="text-xs text-red-600 mt-1">{uploadErr}</p>}
        </div>
      </div>

      {/* Nome */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome completo *</label>
        <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
          className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm
            focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
      </div>

      {/* E-mail (somente leitura) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</label>
        <input type="email" value={user?.email ?? ''} disabled
          className="block w-full rounded-xl border border-slate-200 dark:border-slate-700
            bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 px-3 py-2.5 text-sm cursor-not-allowed" />
          <p className="text-[10px] text-slate-400">Para alterar o e-mail, use a aba "E-mail".</p>
      </div>

      {/* Telefone / WhatsApp */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Telefone / WhatsApp
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            📱
          </span>
          <input
            type="tel"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm
              focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200"
          />
        </div>
        <p className="text-[10px] text-slate-400">
          Usado para contato e notificações via WhatsApp.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="submit" disabled={saving}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--fp-primary, #5086C6)' }}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

// ─── Aba: Alterar senha ───────────────────────────────────────────────────────

function SenhaTab({ onSaved }: { onSaved: () => void }) {
  const [nova, setNova]           = useState('')
  const [confirma, setConfirma]   = useState('')
  const [showNova, setShowNova]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (nova.length < 8) { setError('A nova senha deve ter ao menos 8 caracteres.'); return }
    if (nova !== confirma) { setError('As senhas não coincidem.'); return }

    setSaving(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: nova })
      if (err) throw err
      toast.success('Senha alterada com sucesso!')
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800
        px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
        ⚠️ Após alterar a senha você será desconectado e precisará fazer login novamente.
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nova senha *</label>
        <div className="relative">
          <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type={showNova ? 'text' : 'password'} value={nova} onChange={e => setNova(e.target.value)}
            placeholder="Mínimo 8 caracteres" required
            className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-11 py-2.5 text-sm
              focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
          <button type="button" onClick={() => setShowNova(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
            {showNova ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {nova && nova.length >= 8 && (
          <p className="text-[10px] text-emerald-600 flex items-center gap-1">
            <CheckCircleIcon className="h-3 w-3" /> Força OK
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar nova senha *</label>
        <div className="relative">
          <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type="password" value={confirma} onChange={e => setConfirma(e.target.value)}
            placeholder="Repita a nova senha" required
            className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm
              focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
        </div>
        {confirma && nova === confirma && (
          <p className="text-[10px] text-emerald-600 flex items-center gap-1">
            <CheckCircleIcon className="h-3 w-3" /> Senhas coincidem
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end pt-1">
        <button type="submit" disabled={saving}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--fp-primary, #5086C6)' }}>
          {saving ? 'Alterando…' : 'Alterar senha'}
        </button>
      </div>
    </form>
  )
}

// ─── Aba: Alterar e-mail ──────────────────────────────────────────────────────

function EmailTab({ currentEmail, onSaved }: { currentEmail: string; onSaved: () => void }) {
  const [novoEmail, setNovoEmail] = useState('')
  const [saving, setSaving]       = useState(false)
  const [sent, setSent]           = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (novoEmail === currentEmail) { setError('O novo e-mail deve ser diferente do atual.'); return }

    setSaving(true)
    try {
      const { error: err } = await supabase.auth.updateUser(
        { email: novoEmail },
        { emailRedirectTo: window.location.origin + '/login' }
      )
      if (err) throw err
      setSent(true)
      toast.success('Confirmação enviada para o novo e-mail!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar alteração.')
    } finally {
      setSaving(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <EnvelopeIcon className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="font-semibold text-slate-900 dark:text-slate-100">Confirmação enviada!</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Enviamos um link de confirmação para <strong>{novoEmail}</strong>.
          Clique no link para confirmar a alteração.
        </p>
        <p className="text-xs text-slate-400">O e-mail atual continuará funcionando até a confirmação.</p>
        <button onClick={onSaved}
          className="mt-2 text-sm font-medium text-ank-600 dark:text-ank-400 hover:underline">
          Fechar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800
        px-4 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
        <p className="font-semibold">Como funciona a alteração de e-mail:</p>
        <p>1. Informe o novo e-mail abaixo.</p>
        <p>2. Enviaremos um link de confirmação para o novo endereço.</p>
        <p>3. Clique no link no e-mail para confirmar a mudança.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail atual</label>
        <input type="email" value={currentEmail} disabled
          className="block w-full rounded-xl border border-slate-200 dark:border-slate-700
            bg-slate-50 dark:bg-slate-800/50 text-slate-400 px-3 py-2.5 text-sm cursor-not-allowed" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Novo e-mail *</label>
        <div className="relative">
          <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
            placeholder="novo@email.com.br" required
            className="block w-full rounded-xl border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm
              focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200" />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end pt-1">
        <button type="submit" disabled={saving}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--fp-primary, #5086C6)' }}>
          {saving ? 'Enviando…' : 'Enviar confirmação'}
        </button>
      </div>
    </form>
  )
}
