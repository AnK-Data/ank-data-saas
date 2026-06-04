import { useNavigate } from 'react-router-dom'
import AnkLogo from '../components/AnkLogo'

const VERSAO = '1.0'
const DATA_VIGENCIA = '03/06/2026'
const EMPRESA = {
  razaoSocial: 'João Paulo de Sousa Tabosa',
  nomeFantasia: 'AnK Data',
  cnpj: '50.238.359/0001-70',
  cidade: 'Campo Grande',
  estado: 'MS',
  dpo: 'João Paulo de Sousa Tabosa',
  emailDpo: 'ti@ankdata.com.br',
}

export default function PrivacidadePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <AnkLogo height={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Política de Privacidade
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Versão {VERSAO} · Vigente a partir de {DATA_VIGENCIA}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">1. Identificação do Controlador e Operador</h2>
            <p>
              A <strong>{EMPRESA.nomeFantasia}</strong> ({EMPRESA.razaoSocial}, CNPJ {EMPRESA.cnpj},
              com sede em {EMPRESA.cidade}/{EMPRESA.estado}) atua como <strong>Operador</strong> dos dados
              pessoais dos colaboradores das franquias cadastradas na plataforma AnK Data Insights.
              O <strong>Controlador</strong> dos dados é a empresa franqueada que contratou os serviços
              da AnK Data e é responsável pela coleta e instrução do tratamento.
            </p>
            <p className="mt-2">
              Para questões relacionadas à privacidade, entre em contato com nosso Encarregado de Dados (DPO):
              <br /><strong>{EMPRESA.dpo}</strong> — <strong>{EMPRESA.emailDpo}</strong>
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">2. Dados Pessoais Tratados</h2>
            <p>A plataforma coleta e processa os seguintes dados pessoais:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Nome completo</strong> — identificação do colaborador</li>
              <li><strong>CPF</strong> — importado da lista Ingresse, usado para identificação única</li>
              <li><strong>Cargo</strong> — definição de perfil de acesso e permissões</li>
              <li><strong>Login Ingresse (usuário)</strong> — identificador de autenticação</li>
              <li><strong>Data e hora do último acesso</strong> — segurança e auditoria</li>
              <li><strong>Preferências da plataforma</strong> — tema, configurações de interface</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">3. Finalidade e Base Legal</h2>
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                <p className="font-semibold">Execução de contrato (Art. 7º, V, LGPD)</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Gestão de acesso à plataforma, autenticação, controle de permissões por loja e módulo.</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                <p className="font-semibold">Legítimo interesse (Art. 7º, IX, LGPD)</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Segurança da plataforma, prevenção de fraudes, audit trail de acessos.</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                <p className="font-semibold">Consentimento (Art. 7º, I, LGPD)</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Registrado no momento do Primeiro Acesso com data e versão da política.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">4. Compartilhamento de Dados</h2>
            <p>Os dados pessoais são compartilhados exclusivamente com:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Supabase Inc. (EUA)</strong> — provedor de banco de dados e autenticação.
                Os dados são armazenados em servidores nos Estados Unidos com adequadas salvaguardas contratuais (SCCs).
                Política de privacidade: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-ank-600 dark:text-ank-400 underline">supabase.com/privacy</a>
              </li>
              <li>
                <strong>Empresa franqueada contratante</strong> — acesso aos dados dos seus próprios colaboradores.
              </li>
            </ul>
            <p className="mt-2">Não compartilhamos dados com terceiros para fins publicitários ou comerciais.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">5. Retenção de Dados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dados de colaboradores <strong>ativos</strong>: mantidos enquanto o vínculo com a franquia estiver ativo</li>
              <li>Dados de colaboradores <strong>inativos</strong>: mantidos por até <strong>5 anos</strong> após inativação (prazo trabalhista)</li>
              <li>Logs de acesso: mantidos por <strong>6 meses</strong></li>
              <li>Após os prazos, os dados são deletados permanentemente</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">6. Seus Direitos (Art. 18, LGPD)</h2>
            <p>Como titular dos dados, você tem direito a:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Acesso</strong> — solicitar uma cópia dos seus dados</li>
              <li><strong>Correção</strong> — solicitar correção de dados incorretos</li>
              <li><strong>Exclusão</strong> — solicitar a exclusão dos seus dados (sujeito a obrigações legais)</li>
              <li><strong>Portabilidade</strong> — receber seus dados em formato estruturado</li>
              <li><strong>Revogação do consentimento</strong> — a qualquer momento</li>
              <li><strong>Oposição</strong> — opor-se ao tratamento em determinadas situações</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, envie e-mail para <strong>privacidade@ankdata.com.br</strong>.
              Responderemos em até <strong>15 dias úteis</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">7. Segurança</h2>
            <p>Adotamos as seguintes medidas técnicas de segurança:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Criptografia em trânsito (TLS/HTTPS)</li>
              <li>Criptografia em repouso no banco de dados (Supabase)</li>
              <li>Controle de acesso por perfil (RBAC)</li>
              <li>Row Level Security (RLS) no banco de dados</li>
              <li>URLs temporárias (assinadas) para documentos sensíveis</li>
              <li>Rate limiting de autenticação</li>
              <li>Audit logs de operações sensíveis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">8. Encarregado de Dados (DPO)</h2>
            <p>
              Nosso Encarregado de Proteção de Dados pode ser contactado em:<br />
              <strong>Nome:</strong> {EMPRESA.dpo}<br />
              <strong>E-mail:</strong> {EMPRESA.emailDpo}<br />
              <strong>Empresa:</strong> {EMPRESA.nomeFantasia} ({EMPRESA.razaoSocial})<br />
              <strong>CNPJ:</strong> {EMPRESA.cnpj}<br />
              <strong>Sede:</strong> {EMPRESA.cidade}/{EMPRESA.estado}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">9. Alterações desta Política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Em caso de alterações relevantes,
              notificaremos os usuários através da plataforma. A versão atual é a <strong>{VERSAO}</strong>,
              vigente desde <strong>{DATA_VIGENCIA}</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">10. Autoridade Supervisora</h2>
            <p>
              Em caso de reclamações não resolvidas, você pode contatar a{' '}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer"
                className="text-ank-600 dark:text-ank-400 underline">
                ANPD — Autoridade Nacional de Proteção de Dados
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <button onClick={() => navigate(-1)}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline">
            ← Voltar
          </button>
        </div>
      </div>
    </div>
  )
}
