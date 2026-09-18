/**
 * Política de privacidade — página pública.
 *
 * Existe por exigência das lojas: Apple e Google recusam o app sem uma URL de
 * política acessível **sem login**. Por isso ela mora fora do `RequireAuth`, no
 * mesmo nível da renovação de garantia.
 *
 * O texto descreve o que o código realmente faz, não um modelo genérico. Cada
 * afirmação aqui foi conferida contra a implementação:
 *
 * - localização só em primeiro plano, no check-in e no check-out
 *   (`mobile-operador/src/lib/localizacao.ts` usa
 *   `requestForegroundPermissionsAsync`; não há permissão de segundo plano em
 *   nenhum dos manifestos);
 * - coordenada gravada nas colunas `check_in_lat/lng` e `check_out_lat/lng` da
 *   ordem de serviço, e em nenhum outro lugar;
 * - fotos anexadas à OS via `registrarFoto`;
 * - nenhuma biblioteca de análise, rastreio, publicidade ou crash reporting
 *   entre as 27 dependências do app.
 *
 * Se alguma dessas coisas mudar no código, este texto passa a mentir — e
 * política de privacidade que não corresponde ao produto é risco jurídico, não
 * detalhe de redação. Atualize os dois juntos.
 */
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

/**
 * Dados do controlador.
 *
 * A LGPD (art. 9º) exige identificação clara de quem controla os dados e um
 * canal de contato. O e-mail é o mesmo já usado no portal; razão social, CNPJ e
 * endereço a Ecomax precisa preencher — não são dados que o código conheça, e
 * inventá-los seria pior do que deixá-los visíveis como pendência.
 */
const CONTROLADOR = {
  nome: 'Ecomax',
  email: 'contato@ecomax.com.br',
  /** Preencher antes de submeter às lojas. */
  razaoSocial: '',
  cnpj: '',
  endereco: '',
};

const ATUALIZADO_EM = '17 de setembro de 2026';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-[17px] font-semibold text-ink-900">{titulo}</h2>
      <div className="mt-2 space-y-3 text-[14px] leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
      <span>{children}</span>
    </li>
  );
}

export function Privacidade() {
  const temDadosCadastrais = CONTROLADOR.razaoSocial && CONTROLADOR.cnpj;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-5">
          <Logo className="h-8" />
          <Link to="/login" className="text-[13px] font-semibold text-forest-500 hover:text-forest-600">
            Entrar no portal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-10">
        <h1 className="text-[28px] font-semibold leading-tight text-ink-900">Política de privacidade</h1>
        <p className="mt-2 text-[14px] text-ink-500">Atualizada em {ATUALIZADO_EM}.</p>

        <div className="mt-8 rounded-2xl border border-ink-200 bg-white px-7 py-8">
          <Secao titulo="Quem somos">
            <p>
              Esta política descreve como a {CONTROLADOR.nome} trata dados pessoais no Portal do Cliente
              (<span className="font-medium">cliente.ecomax.com.br</span>), no aplicativo Ecomax Operador e no
              sistema administrativo que dá suporte aos dois.
            </p>
            {temDadosCadastrais ? (
              <p>
                {CONTROLADOR.razaoSocial}, inscrita no CNPJ {CONTROLADOR.cnpj}
                {CONTROLADOR.endereco ? `, com sede em ${CONTROLADOR.endereco}` : ''}, é a controladora dos
                dados tratados aqui.
              </p>
            ) : (
              <p>
                A {CONTROLADOR.nome} é a controladora dos dados tratados nestes sistemas. Para falar sobre
                privacidade, escreva para{' '}
                <a className="font-medium text-forest-500 hover:underline" href={`mailto:${CONTROLADOR.email}`}>
                  {CONTROLADOR.email}
                </a>
                .
              </p>
            )}
          </Secao>

          <Secao titulo="Que dados tratamos">
            <p>
              <span className="font-medium text-ink-900">Para acessar os sistemas:</span> nome, e-mail e senha.
              A senha é guardada de forma cifrada e ninguém na Ecomax consegue lê-la.
            </p>
            <p>
              <span className="font-medium text-ink-900">Para prestar o serviço contratado:</span> dados da
              empresa cliente e das pessoas de contato, ordens de serviço, produtos aplicados, documentos
              anexados e o histórico de cada atendimento.
            </p>
            <p>
              <span className="font-medium text-ink-900">Dos profissionais em campo:</span> quando a empresa
              cliente exige controle de acesso às suas instalações, tratamos documentos de identificação e
              comprovantes ocupacionais fornecidos pela própria Ecomax ou pelo profissional.
            </p>
          </Secao>

          <Secao titulo="Localização no aplicativo do operador">
            <p>
              O aplicativo Ecomax Operador pede acesso à localização para registrar <span className="font-medium text-ink-900">onde</span>{' '}
              o profissional iniciou e encerrou cada ordem de serviço. Isso comprova ao cliente que o
              atendimento aconteceu no endereço combinado.
            </p>
            <ul className="space-y-2">
              <Item>
                A coordenada é lida <span className="font-medium text-ink-900">apenas nesses dois momentos</span> —
                no check-in e no check-out. Não há leitura contínua.
              </Item>
              <Item>
                O aplicativo <span className="font-medium text-ink-900">nunca acessa a localização em segundo
                plano</span>. Com o app fechado ou fora da tela, nada é lido.
              </Item>
              <Item>
                Se o profissional recusar a permissão, ou não houver sinal, o registro acontece do mesmo jeito,
                sem coordenada. A localização não é condição para trabalhar.
              </Item>
              <Item>Não usamos essas coordenadas para traçar rotas, medir deslocamento ou monitorar jornada.</Item>
            </ul>
          </Secao>

          <Secao titulo="Câmera e fotos">
            <p>
              O aplicativo pede acesso à câmera e à galeria para que o profissional anexe fotos da execução do
              serviço à ordem correspondente. As imagens são enviadas apenas para o sistema da Ecomax e ficam
              visíveis para a equipe responsável e para o cliente daquela ordem.
            </p>
            <p>
              O acesso acontece só quando a pessoa toca no botão de anexar. O aplicativo não lê a galeria por
              conta própria nem envia imagens em segundo plano.
            </p>
          </Secao>

          <Secao titulo="O que não fazemos">
            <ul className="space-y-2">
              <Item>Não vendemos, alugamos nem cedemos dados pessoais a terceiros.</Item>
              <Item>
                Não usamos ferramentas de análise de comportamento, publicidade ou rastreamento. Não há
                cookies de terceiros, pixels de rastreio nem identificadores de propaganda em nenhum dos
                sistemas.
              </Item>
              <Item>Não acompanhamos a atividade dos usuários em aplicativos ou sites de outras empresas.</Item>
              <Item>Não usamos dados pessoais para treinar modelos de inteligência artificial.</Item>
            </ul>
          </Secao>

          <Secao titulo="Por que tratamos esses dados">
            <p>
              Tratamos dados para executar o contrato firmado com a empresa cliente, para cumprir obrigações
              legais e regulatórias da atividade, e para o exercício regular de direitos — as bases legais dos
              artigos 7º e 11 da Lei Geral de Proteção de Dados.
            </p>
          </Secao>

          <Secao titulo="Com quem compartilhamos">
            <p>
              Os dados ficam em infraestrutura de nuvem contratada para hospedar o sistema, que atua como
              operadora e trata os dados apenas conforme nossas instruções. Além disso, compartilhamos dados
              com autoridades quando há obrigação legal, e com a própria empresa cliente, que tem acesso às
              informações dos atendimentos contratados por ela.
            </p>
          </Secao>

          <Secao titulo="Por quanto tempo guardamos">
            <p>
              Mantemos os dados enquanto durar a relação contratual e, depois dela, pelo prazo exigido pela
              legislação aplicável — registros fiscais, obrigações trabalhistas e prazos de garantia dos
              serviços prestados. Encerrados os prazos, os dados são eliminados ou anonimizados.
            </p>
          </Secao>

          <Secao titulo="Seus direitos">
            <p>A LGPD garante a você, a qualquer momento e sem custo:</p>
            <ul className="space-y-2">
              <Item>confirmar se tratamos dados seus e obter acesso a eles;</Item>
              <Item>corrigir dados incompletos, inexatos ou desatualizados;</Item>
              <Item>pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados fora da lei;</Item>
              <Item>solicitar a portabilidade a outro fornecedor;</Item>
              <Item>saber com quem compartilhamos seus dados;</Item>
              <Item>revogar consentimento, quando o tratamento se basear nele.</Item>
            </ul>
            <p>
              Para exercer qualquer um deles, escreva para{' '}
              <a className="font-medium text-forest-500 hover:underline" href={`mailto:${CONTROLADOR.email}`}>
                {CONTROLADOR.email}
              </a>
              . Respondemos nos prazos previstos em lei.
            </p>
          </Secao>

          <Secao titulo="Segurança">
            <p>
              O acesso aos sistemas exige autenticação individual, e cada pessoa enxerga apenas os dados
              compatíveis com seu papel — as regras são aplicadas no próprio banco de dados, não só na tela.
              As conexões são cifradas de ponta a ponta e os documentos anexados ficam em armazenamento
              privado, acessível somente por links temporários gerados para quem tem permissão.
            </p>
          </Secao>

          <Secao titulo="Exclusão da conta e dos dados">
            <p>
              As contas do Portal do Cliente e do aplicativo Operador são criadas pela Ecomax a pedido da
              empresa cliente. Para excluir uma conta e os dados associados, escreva para{' '}
              <a className="font-medium text-forest-500 hover:underline" href={`mailto:${CONTROLADOR.email}`}>
                {CONTROLADOR.email}
              </a>
              . Dados que a Ecomax precise manter por obrigação legal são preservados apenas pelo prazo exigido
              e permanecem inacessíveis para uso comercial.
            </p>
          </Secao>

          <Secao titulo="Mudanças nesta política">
            <p>
              Se esta política mudar, publicamos a versão nova nesta mesma página e atualizamos a data no
              topo. Mudanças relevantes são comunicadas pelos canais de atendimento.
            </p>
          </Secao>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-400">
          Dúvidas sobre privacidade:{' '}
          <a className="font-medium text-forest-500 hover:underline" href={`mailto:${CONTROLADOR.email}`}>
            {CONTROLADOR.email}
          </a>
        </p>
      </main>
    </div>
  );
}
