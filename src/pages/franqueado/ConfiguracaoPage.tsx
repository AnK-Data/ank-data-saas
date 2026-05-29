import { useEffect, useState, useCallback, type FormEvent } from 'react'
import {
  BuildingOffice2Icon,
  SwatchIcon,
  BellIcon,
  Cog8ToothIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { applyFranchiseColors } from '../../hooks/useTenantTheme'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface TenantConfig {
  id: string
  nome_franquia: string
  razao_social: string | null
  cnpj: string | null
  telefone: string | null
  email_contato: string | null
  site: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  cidade: string | null
  estado: string | null
  logo_url: string | null
  cor_primaria: string | null
  cor_secundaria: string | null
}

type Tab = 'empresa' | 'marca' | 'notificacoes' | 'operacional'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'empresa',       label: 'Empresa',      icon: BuildingOffice2Icon },
  { id: 'marca',         label: 'Marca',        icon: SwatchIcon          },
  { id: 'notificacoes',  label: 'Notificações', icon: BellIcon            },
  { id: 'operacional',   label: 'Operacional',  icon: Cog8ToothIcon       },
]

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfiguracaoPage() {
  const { profile } = useAuth()
  const [tab, setTab]         = useState<Tab>('empresa')
  const [config, setConfig]   = useState<TenantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!profile?.tenant_id) { setLoading(false); return }
    supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single()
      .then(({ data }) => {
        if (data) setConfig(data as TenantConfig)
        setLoading(false)
      })
  }, [profile?.tenant_id])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!config || !profile?.tenant_id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nome_franquia:  config.nome_franquia,
          razao_social:   config.razao_social,
          cnpj:           config.cnpj,
          telefone:       config.telefone,
          email_contato:  config.email_contato,
          site:           config.site,
          cep:            config.cep,
          logradouro:     config.logradouro,
          numero:         config.numero,
          complemento:    config.complemento,
          cidade:         config.cidade,
          estado:         config.estado,
          logo_url:       config.logo_url,
          cor_primaria:   config.cor_primaria,
          cor_secundaria: config.cor_secundaria,
        })
        .eq('id', profile.tenant_id)
      if (error) throw error

      // Garante que as cores estão aplicadas após salvar (Spec 11)
      applyFranchiseColors(
        config.cor_primaria  ?? '#2563eb',
        config.cor_secundaria ?? '#06b6d4',
      )

      toast.success('Configurações salvas com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const set = useCallback((field: keyof TenantConfig, value: string) => {
    setConfig(prev => {
      if (!prev) return prev
      const updated = { ...prev, [field]: value }
      // Aplica cores em tempo real ao modificar
      if (field === 'cor_primaria' || field === 'cor_secundaria') {
        applyFranchiseColors(
          field === 'cor_primaria' ? value : (updated.cor_primaria ?? '#2563eb'),
          field === 'cor_secundaria' ? value : (updated.cor_secundaria ?? '#06b6d4'),
        )
      }
      return updated
    })
  }, [])

  if (loading) return <Spinner fullScreen />
  if (!config) return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
      Configurações não disponíveis.
    </div>
  )

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
      {/* ── Cabeçalho com botão salvar ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Configuração — {config.nome_franquia}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Personalize sua franquia na plataforma ANK Data
          </p>
        </div>
        <Button type="submit" loading={saving}>
          💾 Salvar Alterações
        </Button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${tab === id
                  ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Conteúdo das tabs ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition-colors">

        {/* EMPRESA */}
        {tab === 'empresa' && (
          <div className="space-y-6">
            <SectionTitle title="Identidade da empresa" subtitle="Dados aparecem em documentos e comunicações." />
            <Input label="Nome da Franquia *" value={config.nome_franquia ?? ''}
              onChange={e => set('nome_franquia', e.target.value)} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Razão Social" value={config.razao_social ?? ''}
                onChange={e => set('razao_social', e.target.value)} placeholder="Empresa Ltda." />
              <Input label="CNPJ" value={config.cnpj ?? ''}
                onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Telefone" value={config.telefone ?? ''}
                onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" />
              <Input label="E-mail de contato" type="email" value={config.email_contato ?? ''}
                onChange={e => set('email_contato', e.target.value)} placeholder="contato@franquia.com.br" />
            </div>
            <Input label="Site" value={config.site ?? ''}
              onChange={e => set('site', e.target.value)} placeholder="https://suafranquia.com.br" />

            <SectionTitle title="Endereço" subtitle="Aparece em documentos e relatórios." />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="CEP" value={config.cep ?? ''}
                onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
              <div className="sm:col-span-2">
                <Input label="Rua / Logradouro" value={config.logradouro ?? ''}
                  onChange={e => set('logradouro', e.target.value)} placeholder="Av. Paulista" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Número" value={config.numero ?? ''}
                onChange={e => set('numero', e.target.value)} placeholder="1234" />
              <Input label="Complemento" value={config.complemento ?? ''}
                onChange={e => set('complemento', e.target.value)} placeholder="Sala 10" />
              <Input label="Cidade" value={config.cidade ?? ''}
                onChange={e => set('cidade', e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="w-32">
              <Input label="UF" value={config.estado ?? ''}
                onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
            </div>
          </div>
        )}

        {/* MARCA */}
        {tab === 'marca' && (
          <div className="space-y-6">
            <SectionTitle title="Identidade Visual (White Label)" subtitle="Personalize a aparência da plataforma para sua franquia." />

            <Input label="Logo URL" value={config.logo_url ?? ''}
              onChange={e => set('logo_url', e.target.value)}
              placeholder="https://seusite.com/logo.png"
              hint="URL pública da imagem. Aparece no topo do painel." />

            {config.logo_url && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <img src={config.logo_url} alt="Logo preview"
                  className="h-12 object-contain rounded"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <p className="text-xs text-slate-500">Preview do logo</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ColorPicker
                label="Cor Primária"
                hint="Botões, links e elementos de destaque"
                value={config.cor_primaria ?? '#2563eb'}
                onChange={v => set('cor_primaria', v)}
              />
              <ColorPicker
                label="Cor Secundária"
                hint="Acentos e destaques complementares"
                value={config.cor_secundaria ?? '#06b6d4'}
                onChange={v => set('cor_secundaria', v)}
              />
            </div>

            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-5 py-4 text-sm text-blue-700 dark:text-blue-400">
              <p className="font-semibold mb-1">💡 White Label Dinâmico</p>
              <p>As cores são aplicadas em tempo real ao salvar. Cada franquia pode ter sua própria identidade visual dentro da plataforma.</p>
            </div>
          </div>
        )}

        {/* NOTIFICAÇÕES */}
        {tab === 'notificacoes' && (
          <div className="space-y-6">
            <SectionTitle title="Preferências de Notificação" subtitle="Configure quando e como deseja ser alertado sobre eventos do sistema." />

            <div className="space-y-3">
              {[
                { label: 'Alertas de licença (expiração e suspensão)', checked: true },
                { label: 'Novos uploads processados com sucesso', checked: true },
                { label: 'Erros de validação em uploads', checked: true },
                { label: 'Relatórios semanais de conformidade', checked: false },
                { label: 'Insights de IA disponíveis', checked: false },
              ].map((item, i) => (
                <label key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                  <input type="checkbox" defaultChecked={item.checked}
                    className="h-4 w-4 rounded accent-ank-600" />
                </label>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
              Em breve: configuração de canais (e-mail, WhatsApp) para cada tipo de notificação.
            </div>
          </div>
        )}

        {/* OPERACIONAL */}
        {tab === 'operacional' && (
          <div className="space-y-6">
            <SectionTitle title="Configurações Operacionais" subtitle="Preferências de localização e aparência do sistema." />

            <ThemeSwitcher />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fuso Horário</label>
                <select className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm">
                  <option value="America/Sao_Paulo">America/São_Paulo (BRT)</option>
                  <option value="America/Campo_Grande">America/Campo_Grande</option>
                  <option value="America/Manaus">America/Manaus</option>
                  <option value="America/Belem">America/Belém</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Idioma</label>
                <select className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm">
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Moeda</label>
              <select className="w-48 block rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm">
                <option value="BRL">BRL — Real Brasileiro</option>
                <option value="USD">USD — Dólar Americano</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  )
}

function ColorPicker({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600 p-0.5 bg-white"
        />
        <div>
          <p className="text-sm font-mono text-slate-700 dark:text-slate-200">{value}</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
      </div>
      {/* Preview swatch */}
      <div className="h-8 rounded-lg transition-colors" style={{ backgroundColor: value }} />
    </div>
  )
}

function ThemeSwitcher() {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">
        Aparência do sistema
      </label>
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        {[
          { value: 'light', label: '☀️ Modo Claro', desc: 'Fundo branco' },
          { value: 'dark',  label: '🌙 Modo Escuro', desc: 'Fundo escuro' },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { if (theme !== opt.value) toggleTheme() }}
            className={`flex flex-col items-start p-4 rounded-xl border-2 transition-colors text-left
              ${theme === opt.value
                ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/40'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
          >
            <span className="text-base mb-0.5">{opt.label.split(' ')[0]}</span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{opt.label.split(' ').slice(1).join(' ')}</span>
            <span className="text-xs text-slate-400">{opt.desc}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">Preferência salva localmente no seu navegador.</p>
    </div>
  )
}
