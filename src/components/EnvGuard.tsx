import type { ReactNode } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function EnvGuard({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured) return <>{children}</>

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-8 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-amber-950/30 p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-bold text-amber-300">Configuração necessária</h1>
        </div>

        <p className="mb-6 text-sm text-slate-300">
          As variáveis de ambiente do Supabase não estão configuradas.
          Crie o arquivo <code className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-200">.env.local</code> na raiz do projeto com o conteúdo abaixo:
        </p>

        <pre className="mb-6 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-emerald-300 leading-relaxed">
{`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui`}
        </pre>

        <p className="text-xs text-slate-500">
          Encontre esses valores em:{' '}
          <strong className="text-slate-400">
            Supabase Dashboard → Project Settings → API
          </strong>
          . Após criar o arquivo, reinicie o servidor de desenvolvimento (
          <code className="rounded bg-slate-800 px-1 text-slate-300">npm run dev</code>).
        </p>
      </div>
    </div>
  )
}
