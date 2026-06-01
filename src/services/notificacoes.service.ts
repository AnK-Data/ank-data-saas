import { supabase } from '../lib/supabaseClient'

export type TipoNotificacao = 'sistema' | 'anuncio' | 'alerta'

export interface Notificacao {
  id: string
  tenant_id: string | null
  usuario_id: string | null
  titulo: string
  corpo: string | null
  tipo: TipoNotificacao
  categoria: string | null
  lida: boolean
  obrigatoria: boolean
  created_at: string
}

export interface NotifPreferencia {
  evento: string
  sino: boolean
  email: boolean
  whatsapp: boolean
}

// Eventos padrão do sistema ANK Data
export const EVENTOS_PADRAO: { evento: string; label: string; descricao: string }[] = [
  { evento: 'upload_concluido',  label: 'Upload de arquivo concluído',         descricao: 'Quando um arquivo de vendas é processado com sucesso.' },
  { evento: 'upload_erro',       label: 'Erro no upload de arquivo',           descricao: 'Quando um arquivo falha na validação ou envio.' },
  { evento: 'licenca_alerta',    label: 'Licença expirando (30 dias)',         descricao: 'Aviso preventivo de vencimento da licença.' },
  { evento: 'licenca_critica',   label: 'Licença expirando (7 dias)',          descricao: 'Alerta crítico de vencimento iminente.' },
  { evento: 'conformidade_alert',label: 'Franquia sem upload há 7 dias',       descricao: 'Alerta de conformidade de envio de relatórios.' },
  { evento: 'novo_usuario',      label: 'Novo usuário adicionado',             descricao: 'Quando um novo membro é convidado para a franquia.' },
  { evento: 'nova_feature',      label: 'Nova funcionalidade ANK Data',        descricao: 'Anúncios de novidades e melhorias da plataforma.' },
  { evento: 'manutencao',        label: 'Manutenção programada',               descricao: 'Avisos de janelas de manutenção do sistema.' },
]

export const NotificacoesService = {
  /** Busca notificações do usuário/tenant (globais + específicas) */
  list: (tenantId: string, userId: string) =>
    supabase
      .from('notificacoes')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .or(`usuario_id.is.null,usuario_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100),

  /** Marca uma notificação como lida — retorna Promise */
  marcarLida: async (id: string) => {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)
    return { error }
  },

  /** Marca todas como lidas — retorna Promise */
  marcarTodasLidas: async (tenantId: string, userId: string) => {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .or(`usuario_id.is.null,usuario_id.eq.${userId}`)
      .eq('lida', false)
    return { error }
  },

  /** Preferências de notificação */
  getPreferencias: (userId: string) =>
    supabase.from('notif_preferencias').select('*').eq('usuario_id', userId),

  upsertPreferencia: (userId: string, evento: string, prefs: Partial<NotifPreferencia>) =>
    supabase.from('notif_preferencias').upsert({
      usuario_id: userId,
      evento,
      ...prefs,
    }),

  /** Cria notificação do sistema (ANK Data) para um tenant */
  createForTenant: (tenantId: string, data: {
    titulo: string; corpo: string; tipo: TipoNotificacao; categoria?: string; obrigatoria?: boolean
  }) =>
    supabase.from('notificacoes').insert({ ...data, tenant_id: tenantId }),
} satisfies Record<string, (...args: never[]) => unknown>
