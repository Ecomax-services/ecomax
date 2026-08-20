/**
 * Traduz o erro do banco para uma frase que diz o que fazer.
 *
 * Sem isto, o que chega à tela é o texto cru do Postgres. Salvar uma base com
 * nome repetido mostrava, em inglês e com o nome da constraint:
 *
 *     duplicate key value violates unique constraint "bases_nome_key"
 *
 * Quem lê isso não descobre que o problema é o nome, nem que basta trocá-lo.
 *
 * A tradução acontece aqui, e não em cada chamada, porque a informação de que
 * `bases_nome_key` é "o nome da base" não pertence a nenhuma tela em
 * particular — pertence ao schema.
 */

/** Restrições de unicidade, pelo nome da constraint que o Postgres devolve. */
const UNICOS: Record<string, string> = {
  bases_nome_key: 'Já existe uma base com esse nome.',
  produtos_codigo_key: 'Já existe um produto com esse código.',
  funcionarios_cpf_key: 'Já existe um colaborador cadastrado com esse CPF.',
  fornecedores_cnpj_key: 'Já existe um fornecedor com esse CNPJ.',
  perfis_acesso_nome_key: 'Já existe um perfil com esse nome.',
  catalogo_itens_catalogo_nome_key: 'Já existe um item com esse nome neste catálogo.',
  cliente_funcionarios_cliente_id_funcionario_id_key: 'Funcionário já vinculado a este cliente.',
  cliente_produtos_homologados_cliente_id_produto_id_key: 'Produto já homologado para este cliente.',
  comercial_garantias_os_id_key: 'Esta OS já tem uma garantia.',
  comercial_garantia_servicos_garantia_id_tipo_servico_key: 'Este serviço já está na garantia.',
  estoque_lotes_produto_id_base_id_lote_key: 'Já existe esse lote deste produto nesta base.',
  estoque_niveis_produto_id_base_id_key: 'Este produto já tem nível definido nesta base.',
  fornecedor_produtos_fornecedor_id_produto_id_key: 'Produto já vinculado a este fornecedor.',
  funcionario_documentos_funcionario_id_tipo_key: 'Este colaborador já tem um documento desse tipo.',
  orcamento_itens_orcamento_id_tipo_controle_key: 'Este tipo de controle já está no orçamento.',
  os_equipamentos_os_id_produto_id_key: 'Equipamento já vinculado a esta OS.',
  os_funcionarios_os_id_funcionario_id_key: 'Funcionário já vinculado a esta OS.',
  os_plano_pontos_plano_id_numero_key: 'Já existe um ponto com esse número neste plano.',
  os_planos_controle_os_id_tipo_controle_key: 'Este tipo de controle já está na OS.',
  os_produtos_os_id_produto_id_key: 'Produto já previsto nesta OS.',
  permissoes_modulo_perfil_acesso_id_modulo_key: 'Este perfil já tem permissão definida para o módulo.',
};

/** Regras de validação do próprio banco. */
const CHECKS: Record<string, string> = {
  fup_acao_depois_do_registro: 'A data da ação não pode ser anterior à data de registro.',
  fup_concluido_exige_descricao: 'Para concluir o follow-up, descreva o que foi feito.',
  orcamento_itens_valor_check: 'O valor do serviço não pode ser negativo.',
  os_plano_pontos_numero_check: 'O número do ponto começa em 1.',
  os_planos_controle_pontos_previstos_check: 'A quantidade de pontos não pode ser negativa.',
  ordens_servico_status_check: 'Situação de OS desconhecida.',
  ordens_servico_etapa_check: 'Etapa desconhecida. Use Planejamento, Execução ou Revisão.',
  ordens_servico_recorrencia_check: 'Recorrência desconhecida.',
  clientes_tipo_pessoa_check: 'Tipo de pessoa deve ser física ou jurídica.',
  clientes_classificacao_abc_check: 'A classificação ABC aceita apenas A, B ou C.',
  cliente_portal_usuarios_status_check: 'Situação de acesso ao portal desconhecida.',
};

/** O nome da constraint citada entre aspas na mensagem do Postgres. */
function constraintDe(msg: string): string {
  return msg.match(/"([^"]+)"/)?.[1] ?? '';
}

interface ErroBanco { code?: string; message?: string; details?: string | null }

export function msgErro(error: ErroBanco | null | undefined, fallback = 'Não foi possível concluir a operação.'): string {
  if (!error) return fallback;
  const msg = error.message ?? '';
  const alvo = constraintDe(msg);

  switch (error.code) {
    case '23505': return UNICOS[alvo] ?? 'Já existe um registro com esses dados.';
    case '23514': return CHECKS[alvo] ?? 'Algum campo está fora do que o sistema aceita.';
    // Chave estrangeira: o registro é referido por outro, ou aponta para um que
    // não existe mais — quase sempre porque alguém apagou enquanto esta tela
    // estava aberta.
    case '23503': return 'Este registro está ligado a outro e não pode ser alterado assim. Recarregue a página e tente de novo.';
    case '23502': return 'Falta preencher um campo obrigatório.';
    // RLS. A pessoa não precisa saber que existe uma policy; precisa saber que
    // o acesso dela não alcança aquilo.
    case '42501': return 'Você não tem permissão para isso.';
    case 'PGRST116': return 'Registro não encontrado. Ele pode ter sido removido — recarregue a página.';
    default: break;
  }

  // Exceções levantadas por funções e triggers do banco já vêm em português e
  // escritas para quem lê a tela; passar por cima delas seria perder informação.
  return msg || fallback;
}
