import { useState } from 'react'
import { ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const VERSAO_TERMOS = '1.0'

interface Props {
  onAceito: () => void
}

export default function AceiteTermosModal({ onAceito }: Props) {
  const { user, refreshProfile } = useAuth()
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false)
  const [aceiteTermos, setAceiteTermos]           = useState(false)
  const [saving, setSaving]                       = useState(false)

  const podeConfirmar = aceitePrivacidade && aceiteTermos

  async function handleConfirmar() {
    if (!podeConfirmar || !user) return
    setSaving(true)
    try {
      await supabase.from('profiles').update({
        lgpd_aceito_em: new Date().toISOString(),
        lgpd_versao:    VERSAO_TERMOS,
      }).eq('id', user.id)
      await refreshProfile()
      onAceito()
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  return (
    // Overlay bloqueante — z-50 garante que fica sobre tudo
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
        border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="bg-ank-600 px-6 py-5 flex items-center gap-3">
          <ShieldCheckIcon className="h-7 w-7 text-white shrink-0" />
          <div>
            <p className="text-base font-bold text-white">Bem-vindo à plataforma AnK Data</p>
            <p className="text-xs text-white/70 mt-0.5">
              Antes de continuar, leia e aceite os termos abaixo
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-6 py-6 space-y-5">
          {/* Resumo dos termos */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Ao usar a plataforma AnK Data Insights, você concorda que:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Seus dados pessoais (nome, e-mail, acessos) serão tratados pela AnK Data conforme a <strong>LGPD (Lei 13.709/2018)</strong></li>
              <li>Os dados dos seus colaboradores importados da Ingresse serão processados para fins de controle de acesso à plataforma</li>
              <li>Os dados são armazenados com segurança na Supabase (EUA), com criptografia e controle de acesso</li>
              <li>Você pode solicitar acesso, correção ou exclusão dos dados a qualquer momento pelo e-mail <strong>ti@ankdata.com.br</strong></li>
              <li>A plataforma utiliza cookies de sessão para autenticação</li>
            </ul>
          </div>

          {/* Links para documentos */}
          <div className="flex gap-3">
            <a href="/privacidade" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700
                px-3 py-2 text-xs font-medium text-ank-600 dark:text-ank-400 hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
              <DocumentTextIcon className="h-4 w-4" />
              Política de Privacidade completa ↗
            </a>
          </div>

          {/* Checkboxes de aceite */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={aceitePrivacidade}
                onChange={e => setAceitePrivacidade(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-ank-600 shrink-0 cursor-pointer" />
              <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">
                Li e aceito a <strong>Política de Privacidade</strong> da AnK Data e autorizo o tratamento
                dos meus dados pessoais conforme descrito.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={aceiteTermos}
                onChange={e => setAceiteTermos(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-ank-600 shrink-0 cursor-pointer" />
              <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">
                Estou ciente de que sou o <strong>Controlador</strong> dos dados dos colaboradores da minha
                franquia e que a AnK Data atuará como <strong>Operador</strong>, processando apenas conforme
                minhas instruções e o contrato firmado.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleConfirmar}
            disabled={!podeConfirmar || saving}
            className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-200
              ${podeConfirmar
                ? 'bg-ank-600 hover:bg-ank-700 text-white shadow-md hover:shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
          >
            {saving ? 'Registrando aceite…' : podeConfirmar ? 'Aceitar e acessar a plataforma' : 'Marque ambas as caixas para continuar'}
          </button>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            Aceite registrado com data e hora · Versão {VERSAO_TERMOS} · {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  )
}
