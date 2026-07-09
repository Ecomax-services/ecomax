# PRD — [Ecomax] Discovery

## 10. Pontos em aberto e bloqueios

Total: **87** gap(s) em aberto (37 bloqueador(es), 36 média, 14 baixa).

### Bloqueadores (severidade alta)

1. **[ALTA]** Produtividade sem baseline ou forma de medição
   - **Localização:** Page 1 > Discovery Corporativo > Métricas selecionadas
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Produtividade' (aumento na eficiência) citada sem indicador específico, baseline ou meta quantitativa.
   - **Para fechar:** Definir: como será medida (ex: OS/hora/técnico), valor atual e meta de aumento percentual.

2. **[ALTA]** Usuários ativos sem baseline ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Adoção e engajamento
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Usuários ativos diários' sem definição de quantos usuários existem hoje, quantos deveriam usar diariamente ou meta.
   - **Para fechar:** Quantificar: base total de usuários, taxa de uso atual e meta de usuários ativos diários.

3. **[ALTA]** Churn rate sem baseline ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Cancelamento e customer success
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Churn rate' sem taxa atual de cancelamento ou meta aceitável.
   - **Para fechar:** Definir: taxa de churn atual, causas principais e meta de redução.

4. **[ALTA]** Health score sem metodologia ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Cancelamento e customer success
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Health score' citada sem definir como será calculado, escala ou meta mínima.
   - **Para fechar:** Definir: metodologia de cálculo do health score, escala (ex: 0-100) e meta mínima (ex: >70).

5. **[ALTA]** SLA de suporte sem tempo-alvo
   - **Localização:** Page 1 > Discovery Corporativo > Operação
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Tempo médio de resposta do suporte' sem definição de SLA alvo por prioridade.
   - **Para fechar:** Estabelecer SLAs por prioridade (ex: crítico <1h, normal <24h) e baseline atual.

6. **[ALTA]** Expiração de token de recuperação de senha não especificada
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Autenticação
   - **Categoria:** cobertura
   - **Descrição:** O fluxo de recuperação de senha menciona envio de link por e-mail mas não define prazo de validade do token nem comportamento após expiração.
   - **Para fechar:** Definir tempo de validade do token de recuperação de senha e o que acontece se o usuário tentar usar um token expirado.

7. **[ALTA]** Taxa de adoção sem meta definida
   - **Localização:** Page 1 > Discovery Corporativo > Métricas selecionadas
   - **Categoria:** metrica_sem_meta
   - **Descrição:** A métrica 'Taxa de adoção' é citada mas não possui valor-alvo, baseline atual ou prazo para atingimento.
   - **Para fechar:** Definir: qual a taxa de adoção atual (baseline), qual meta esperada (ex: 90% em 6 meses) e prazo.

8. **[ALTA]** Tempo de processamento sem baseline ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Métricas selecionadas
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Tempo de processamento' mencionada sem valor atual, meta de redução ou processos específicos sendo medidos.
   - **Para fechar:** Especificar: quais processos serão medidos, tempo atual médio e meta de redução (ex: de 2h para 30min).

9. **[ALTA]** Quantidade de erros sem baseline ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Métricas selecionadas
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Erros' citada sem quantificação atual, tipos de erros prioritários ou meta de redução.
   - **Para fechar:** Definir: quantos erros ocorrem hoje (por período/processo), tipos críticos e meta (ex: reduzir em 80%).

10. **[ALTA]** Automação de processos sem percentual alvo
   - **Localização:** Page 1 > Discovery Corporativo > Métricas selecionadas
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica '% de processos manuais automatizados' sem definição de quantos processos existem, quantos são manuais hoje e qual meta.
   - **Para fechar:** Mapear: total de processos manuais atuais, priorização e meta de automação (ex: 70% nos primeiros 12 meses).

11. **[ALTA]** Configurações de notificação citadas mas não detalhadas
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Notificações
   - **Categoria:** cobertura
   - **Descrição:** Os critérios mencionam 'configurações definidas, podendo ser emitidas in-app e/ou por e-mail' mas não há detalhamento de onde/como o usuário configura preferências.
   - **Para fechar:** Detalhar a funcionalidade de configuração de notificações: onde fica, quais opções o usuário pode escolher, se há configuração por tipo de notificação.

12. **[ALTA]** Regras de quando emitir cada tipo de notificação não especificadas
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Notificações
   - **Categoria:** cobertura
   - **Descrição:** Há exemplos de notificações ('Nova ordem de serviço', 'Documentos próximos da validade', 'Documentos expirados') mas não há definição de gatilhos, condições ou prazos para emissão.
   - **Para fechar:** Especificar para cada tipo de notificação: gatilho exato, condição de emissão, prazo antecedente (no caso de validade), destinatários.

13. **[ALTA]** Redirecionamento para módulo Comercial sem detalhamento
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Operacional > 4 Lista de orçamentos e OS
   - **Categoria:** cobertura
   - **Descrição:** A funcionalidade 'Novo orçamento' redireciona para o módulo Comercial (nota ²) mas este módulo não foi detalhado neste trecho.
   - **Para fechar:** Incluir o detalhamento do módulo Comercial no Discovery ou indicar explicitamente que será tratado em outro trecho.

14. **[ALTA]** Status de OS não listados
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Operacional > 4 Lista de orçamentos e OS
   - **Categoria:** cobertura
   - **Descrição:** Há referência a 'Status (badge colorido)¹' mas a nota ¹ não aparece no trecho e não há lista dos status possíveis.
   - **Para fechar:** Listar todos os status possíveis de OS e orçamento, com cores/rótulos e fluxo de transição entre status.

15. **[ALTA]** Fluxo 'Converter em OS' não detalhado
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Operacional > 4 Lista de orçamentos e OS
   - **Categoria:** cobertura
   - **Descrição:** Ao pressionar linha de orçamento, aparece opção 'Converter em OS' mas não há detalhamento deste fluxo.
   - **Para fechar:** Detalhar o fluxo de conversão: quais dados são herdados, o que precisa ser preenchido, validações, transição de status do orçamento.

16. **[ALTA]** Limite de tamanho de anexo não especificado
   - **Localização:** 5.2.3 Anexos da Garantia
   - **Categoria:** metrica_sem_meta
   - **Descrição:** A seção menciona 'Anexo grande' nas notificações (>10MB), mas não define o limite permitido na funcionalidade 5.2.3. Há contradição: notificações dizem >10MB é bloqueado, mas a funcionalidade não especifica o limite.
   - **Para fechar:** Definir explicitamente na funcionalidade 5.2.3: qual o tamanho máximo permitido por anexo? 10MB é o limite ou apenas o gatilho de alerta? Se for limite, precisa estar nas regras da funcionalidade.

17. **[ALTA]** Tipos de arquivo permitidos não especificados
   - **Localização:** 5.2.3 Anexos da Garantia
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A funcionalidade menciona 'tipo não permitido' nas notificações, mas não lista quais tipos são permitidos ou bloqueados. Apenas diz 'preview inline (PDF e imagens)' mas isso não define a whitelist/blacklist de upload.
   - **Para fechar:** Especificar lista exata de extensões/MIME types permitidos (ex: PDF, JPEG, PNG, DOCX) e se há tipos explicitamente bloqueados (ex: executáveis).

18. **[ALTA]** Integração Omie sem mapeamento de campos
   - **Localização:** Impactos em outros módulos
   - **Categoria:** pergunta_cliente
   - **Descrição:** 'Ao renovar Garantia, dados financeiros (valor, vigência) são enviados para emissão de NF' não especifica: quais campos exatos da Garantia mapeiam para quais campos da API Omie? Há transformação? Validação de retorno? Retry em caso de erro?
   - **Para fechar:** Cliente/arquiteto deve fornecer: mapeamento campo-a-campo Garantia↔Omie, endpoint da API, autenticação, tratamento de erros (retry, fila, notificação) e se é síncrono ou assíncrono.

19. **[ALTA]** Drawer/modal de planos sem estrutura detalhada
   - **Localização:** 3.1.3 Emitir ordem de serviço > Planos contratados
   - **Categoria:** cobertura
   - **Descrição:** Cita que cada chip 'abre um drawer/modal específico daquele plano com os campos do controle (identificação, localização, estado, ação corretiva, conclusão, etc., conforme o tipo)', mas não mapeia a estrutura completa de campos para cada tipo de plano.
   - **Para fechar:** Detalhar para cada tipo (Armadilha Luminosa, Controle Roedores, Globo de Moscas, Praga de Grãos, Monitoramento de Áreas, Caixa D'água): lista completa de campos, obrigatoriedade, tipo de dado, validações e regras de negócio.

20. **[ALTA]** Ações do fluxo sem detalhamento de comportamento
   - **Localização:** 3.1.3 Emitir ordem de serviço > Fluxo de situação
   - **Categoria:** cobertura
   - **Descrição:** Lista 10 ações (Emitir, Email, Confirmar, Executado, Baixar Estoque, Finalizar, Cancelar, Remarcar, Alterar Data, Não Executada) sem especificar: o que cada ação faz, regras de transição de estado, validações obrigatórias, impactos em outros módulos.
   - **Para fechar:** Mapear para cada ação: pré-condições, campos obrigatórios, validações, transições de status permitidas, efeitos colaterais (ex: 'Baixar Estoque' atualiza módulo 6) e mensagens de feedback.

21. **[ALTA]** Categorias de relatórios sem detalhamento de estrutura
   - **Localização:** 7.1 Emitir relatórios internos > Categorias
   - **Categoria:** cobertura
   - **Descrição:** Lista categorias (Estoque, Movimentações, Produtos, Operacional, Comercial, Financeiro, Sugestões) mas não detalha: quais campos/filtros cada categoria exige, qual a fonte de dados, formato de saída específico ou regras de cálculo.
   - **Para fechar:** Para cada categoria, especificar: campos obrigatórios e opcionais, origem dos dados (tabelas/módulos), formato de apresentação (tabular, gráfico, resumo) e totalizadores esperados.

22. **[ALTA]** Template padrão de e-mail não especificado
   - **Localização:** 6.2 Cotações
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A funcionalidade 'Enviar cotação por e-mail' menciona 'template padrão' mas não há descrição do conteúdo, campos dinâmicos, layout ou anexos que esse e-mail deve conter.
   - **Para fechar:** Especificar o conteúdo mínimo do template: campos obrigatórios (produtos, quantidades, prazo de resposta, dados de contato), formato de apresentação e se haverá anexos (PDF da cotação, por exemplo).

23. **[ALTA]** Comparativo visual entre fornecedores não detalhado
   - **Localização:** 6.2 Cotações
   - **Categoria:** cobertura
   - **Descrição:** O 'comparativo visual entre fornecedores' é citado como 'tabela lado a lado com valores, prazos e condições destacando o melhor de cada coluna', mas não há especificação de quais colunas exatamente, critérios de destaque, ordenação ou se permite exportação.
   - **Para fechar:** Detalhar estrutura da tabela comparativa: colunas exatas, regras de destaque (menor valor em verde, por exemplo), ordenação padrão, e se há opção de exportar ou imprimir o comparativo.

24. **[ALTA]** Fluxo de aprovação em 2 níveis não totalmente especificado
   - **Localização:** 6.3 Requisições de compras
   - **Categoria:** cobertura
   - **Descrição:** O fluxo menciona 'Solicitante cria → Aprovador aprova ou recusa' mas não define: quem é o aprovador (por perfil, por alçada de valor, por localização?), se há aprovação escalonada, se o solicitante pode ser o próprio aprovador, ou se há limite de valor que dispensa aprovação.
   - **Para fechar:** Especificar matriz de aprovação: quem pode aprovar (perfil/cargo), regras de alçada (ex: valores acima de X exigem gestor), e se há dispensa de aprovação em algum cenário.

25. **[ALTA]** Critério de 'Melhor avaliado' não especificado
   - **Localização:** 6.4 Fornecedores
   - **Categoria:** metrica_sem_meta
   - **Descrição:** O indicador 'Melhor avaliado (prazo + resposta)' está descrito mas não define a fórmula de cálculo: peso de cada dimensão, como são normalizados prazo e taxa de resposta, se há período mínimo de histórico, ou se considera apenas cotações aprovadas.
   - **Para fechar:** Definir algoritmo de avaliação: fórmula exata (média ponderada? score de 0-100?), pesos de prazo e resposta, período de referência e tratamento de fornecedores novos sem histórico.

26. **[ALTA]** Telas do módulo Estoque e Produtos não detalhadas
   - **Localização:** Page 1 > Discovery Corporativo > Estoque e Produtos > Telas
   - **Categoria:** cobertura
   - **Descrição:** As telas 6 Produtos, 6.1 Inventário, 6.2 Cotações, 6.3 Requisições de compras, 6.4 Fornecedores, 6.5 Estoque, 6.1.a Inventário, 6.5.a Movimentações e 6.5.b Inventário Físico foram listadas mas não possuem detalhamento de funcionalidades, critérios de aceite, notificações ou impactos.
   - **Para fechar:** Detalhar cada tela do módulo Estoque e Produtos com funcionalidades, campos, ações, critérios de aceite e impactos em outros módulos, seguindo o mesmo padrão aplicado ao módulo Gestão de Clientes.

27. **[ALTA]** Funções especiais 'Criar MEC EPF' e 'Gerar Link' sem detalhamento
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3 Gestão de Clientes
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** As funções 'Criar MEC EPF' e 'Gerar Link' são mencionadas mas não há especificação de o que fazem, quais campos/parâmetros exigem, qual o resultado esperado ou critérios de aceite.
   - **Para fechar:** Detalhar o comportamento de cada função especial: propósito, entradas, saídas, fluxo de tela/modal, validações e critérios de aceite.

28. **[ALTA]** Calendário/Report do orçamento sem detalhamento
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.1 Elaborar Orçamento
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A funcionalidade menciona 'Visualizar Calendário/Report do orçamento' mas não especifica o que é exibido, formato, filtros, dados ou interações possíveis.
   - **Para fechar:** Detalhar o que compõe o Calendário/Report: dados exibidos, visualizações disponíveis, filtros, exportação e critérios de aceite.

29. **[ALTA]** Frequência e valores de serviços sem detalhamento
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.1 Elaborar Orçamento
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** Menciona 'Frequência (mensal, trimestral, etc.)' e 'Valor por serviço' mas não especifica como são calculados, se são tabelas predefinidas, se há validação de valores ou regras de composição do valor total.
   - **Para fechar:** Detalhar origem da frequência e valores: tabela fixa, cadastro parametrizável, regras de cálculo do valor total, validações e critérios de aceite.

30. **[ALTA]** Ações da toolbar sem detalhamento
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.2 Cadastro de Funcionário Integrado
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** As ações 'Consumo de Funcionário', 'Criar MEC EF' e 'Substituir Funcionário' são citadas mas não há descrição de o que fazem, fluxos, entradas, saídas ou critérios de aceite.
   - **Para fechar:** Detalhar cada ação da toolbar: propósito, fluxo de interação, parâmetros, validações, impactos em outros módulos e critérios de aceite.

31. **[ALTA]** Conceito de 'Integração com Empresas' não definido
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.2.a Integração com Empresas
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A aba menciona integração com empresas, data de vencimento e indicador visual, mas não explica o que é essa integração, qual o propósito, campos do modal de cadastro ou impacto funcional.
   - **Para fechar:** Definir claramente o conceito de 'Integração com Empresas': o que vincula, por que tem vencimento, campos do cadastro, regras de negócio e critérios de aceite.

32. **[ALTA]** Vínculo de serviços do funcionário sem detalhamento
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.2.b Serviços do Funcionário
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** Menciona 'Vincular novo serviço executável pelo funcionário' mas não detalha origem dos serviços disponíveis, campos obrigatórios, validações ou impacto no restante do sistema.
   - **Para fechar:** Detalhar origem dos serviços (tabela fixa, cadastro em outro módulo), campos do vínculo (data início, fim, certificação), validações e impactos (ex: controle de execução de OS).

33. **[ALTA]** Conceito de 'Linhas MEC' não definido
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.2.c Linhas MEC
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A aba menciona 'Linhas MEC' com código, descrição e status, mas não explica o que são, para que servem, regras de criação/edição ou impacto funcional.
   - **Para fechar:** Definir o que são 'Linhas MEC', seu propósito no contexto do funcionário integrado, campos obrigatórios, regras de negócio e critérios de aceite.

34. **[ALTA]** Calendário/Report do orçamento sem detalhamento (aba)
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.a Aba Orçamentos
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** Menciona 'Acesso a Calendário/Report do orçamento' mas sem especificação de conteúdo, formato ou interações.
   - **Para fechar:** Detalhar o Calendário/Report acessível pela aba: dados exibidos, filtros, navegação, exportação e critérios de aceite.

35. **[ALTA]** Modal 3.1.d referenciado incorretamente
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.b Aba Funcionários Integrados
   - **Categoria:** cobertura
   - **Descrição:** A funcionalidade menciona 'Adicionar funcionário existente ao cliente (modal de seleção) →3.1.d', mas 3.1.d é o modal de Usuários do portal, não de seleção de funcionários.
   - **Para fechar:** Corrigir a referência: criar uma nova identificação para o modal de seleção de funcionários ou esclarecer se 3.1.d foi usado por engano.

36. **[ALTA]** Tela 3.1.3 Emitir ordem de serviço não detalhada
   - **Localização:** Page 1 > Gestão de Clientes > Telas
   - **Categoria:** cobertura
   - **Descrição:** A tela 3.1.3 é citada várias vezes (em Anotações, Notificações, Impactos e Funcionalidades) mas não possui seção própria detalhando funcionalidades, campos, ações, critérios de aceite ou fluxo completo.
   - **Para fechar:** Criar seção detalhada para 3.1.3 Emitir ordem de serviço, incluindo campos, ações da toolbar (10 ações citadas), planos de controle (chips), modal de emissão, relatório técnico, consumo real (3.1.3.c) e critérios de aceite.

37. **[ALTA]** Origem do pré-preenchimento do relatório técnico
   - **Localização:** 7.2 Emitir relatórios técnicos
   - **Categoria:** pergunta_cliente
   - **Descrição:** Afirma que relatório técnico vem pré-preenchido com 'dados da execução registrada no app (4.1.1)', mas não especifica: quais campos do app alimentam quais campos do relatório, se há transformação de dados ou se tudo é espelhamento direto.
   - **Para fechar:** Cliente/stakeholder deve confirmar: mapeamento exato campo-a-campo entre app Operador (4.1.1) e relatório técnico (7.2), incluindo fotos, assinaturas, produtos e mapeamento de pontos.

### Severidade média

1. **[MEDIA]** Uptime sem meta de disponibilidade
   - **Localização:** Page 1 > Discovery Corporativo > Métricas selecionadas
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Uptime' sem definição de meta de disponibilidade (ex: 99.5% ou 99.9%) ou janelas de manutenção permitidas.
   - **Para fechar:** Estabelecer SLA de uptime esperado e horários críticos de operação.

2. **[MEDIA]** Engajamento por funcionalidade sem meta
   - **Localização:** Page 1 > Discovery Corporativo > Adoção e engajamento
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica '% de usuários que usam cada funcionalidade' sem definição de funcionalidades críticas ou meta mínima de uso.
   - **Para fechar:** Listar funcionalidades prioritárias e definir meta de adoção mínima para cada (ex: 80% usam app mobile).

3. **[MEDIA]** Crescimento de receita sem meta percentual
   - **Localização:** Page 1 > Discovery Corporativo > Crescimento
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Crescimento de receita' sem baseline de receita atual atribuível ao sistema ou meta de crescimento.
   - **Para fechar:** Definir: receita baseline relacionada aos processos do sistema e meta de crescimento percentual.

4. **[MEDIA]** Novos clientes sem meta de aquisição
   - **Localização:** Page 1 > Discovery Corporativo > Crescimento
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Clientes adquiridos' sem meta numérica ou relação com capacidades do sistema.
   - **Para fechar:** Estabelecer meta de novos clientes e como o sistema contribui para aquisição.

5. **[MEDIA]** Taxa de conversão sem baseline ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Crescimento
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Taxa de conversão' sem definição de funil, taxa atual ou meta percentual.
   - **Para fechar:** Mapear funil de conversão, baseline atual e meta (ex: de 15% para 25%).

6. **[MEDIA]** Upselling/cross-selling sem baseline ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Cancelamento e customer success
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica de aumento de receita de clientes atuais sem baseline ou meta de crescimento.
   - **Para fechar:** Quantificar receita atual por cliente e meta de upsell/cross-sell.

7. **[MEDIA]** Custo de suporte sem baseline ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Operação
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Valor médio gasto por cliente com suporte' sem custo atual ou meta de otimização.
   - **Para fechar:** Calcular custo atual de suporte por cliente e definir meta de redução.

8. **[MEDIA]** Escalabilidade sem parâmetros quantitativos
   - **Localização:** Page 1 > Discovery Corporativo > Operação
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Capacidade de lidar com aumento de usuários' sem definir volume atual, crescimento esperado ou limite técnico.
   - **Para fechar:** Especificar: usuários atuais, crescimento esperado (ex: 3x em 2 anos) e requisitos de performance.

9. **[MEDIA]** Persona 1 citada mas não apresentada
   - **Localização:** Page 1 > Discovery Corporativo > Divisão de tarefas por profissionais > Yasmin - Analista de RH
   - **Categoria:** persona_faltante
   - **Descrição:** O texto menciona 'Todas as citadas na persona 1, exceto Omie' mas a persona 1 não foi apresentada neste trecho do Discovery.
   - **Para fechar:** Incluir a descrição completa da persona 1 ou listar explicitamente as ferramentas utilizadas por Yasmin.

10. **[MEDIA]** Critério 'feedback claro' não especifica mensagens
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Autenticação > Critérios de aceite
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** O critério 'Sistema valida campos obrigatórios e exibe feedback claro de erro/sucesso' não define quais mensagens devem aparecer em cada situação.
   - **Para fechar:** Listar as mensagens de erro/sucesso esperadas para cada cenário (senha incorreta, campo vazio, sessão iniciada, etc.).

11. **[MEDIA]** Limite de tentativas de login não especificado
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Autenticação
   - **Categoria:** cobertura
   - **Descrição:** Não há definição sobre bloqueio de conta após tentativas falhas de login.
   - **Para fechar:** Definir se haverá bloqueio por tentativas inválidas, quantas tentativas são permitidas, tempo de bloqueio e como desbloquear.

12. **[MEDIA]** Critério 'grande volume' para agrupamento não definido
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Notificações > Funcionalidades
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A funcionalidade diz 'Agrupar implicitamente por data quando houver grande volume' mas não define o que é 'grande volume'.
   - **Para fechar:** Definir a partir de quantas notificações o agrupamento por data deve ser aplicado.

13. **[MEDIA]** Ações 'Cancelar' e 'Duplicar' não especificadas
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Operacional > 4.1 Detalhes da OS
   - **Categoria:** cobertura
   - **Descrição:** Há botões 'Cancelar OS' e 'Duplicar' mas não há definição de comportamento: o que acontece ao cancelar (status final, se permite reabrir), o que é duplicado exatamente.
   - **Para fechar:** Detalhar comportamento de cancelamento (transição de status, se permite reverter, se mantém histórico) e duplicação (quais campos são copiados, quais são limpos).

14. **[MEDIA]** Transição 'Marcar como executada' não especificada
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Operacional > 4.1 Detalhes da OS
   - **Categoria:** cobertura
   - **Descrição:** Há botão 'Marcar como executada' mas não há detalhamento de validações necessárias (além da assinatura mencionada na aba Execução) nem transição de status.
   - **Para fechar:** Especificar todas as validações obrigatórias (assinatura, check-out, produtos preenchidos, etc.) e o status final resultante.

15. **[MEDIA]** Indicador de estoque sem limites definidos
   - **Localização:** Page 1 > Operacional > 4.2.1 Vincular produtos e dados
   - **Categoria:** metrica_sem_meta
   - **Descrição:** O modal de seleção do almoxarifado exibe indicador de estoque com cores (verde/amarelo/vermelho), mas não define os valores ou percentuais que definem cada faixa.
   - **Para fechar:** Definir os limites numéricos ou percentuais que acionam cada cor do indicador de estoque (ex: verde > 50%, amarelo 20-50%, vermelho < 20%).

16. **[MEDIA]** Edição de cronograma sem especificação do comportamento
   - **Localização:** Page 1 > Operacional > 4.2.1 Vincular produtos e dados
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A funcionalidade 'Visualizar cronograma e editar próximas datas geradas automaticamente (apenas se OS recorrente)' não especifica quantas datas futuras podem ser editadas, se há limite temporal, ou se afeta apenas a OS atual ou todo o padrão de recorrência.
   - **Para fechar:** Definir o escopo da edição do cronograma: quantas ocorrências futuras são editáveis, se editar uma data altera o padrão de recorrência ou apenas aquela instância, e qual o horizonte temporal exibido.

17. **[MEDIA]** Comportamento do modal de almoxarifado não detalhado
   - **Localização:** Page 1 > Operacional > 4.2.1 Vincular produtos e dados
   - **Categoria:** cobertura
   - **Descrição:** O modal de seleção do almoxarifado menciona pesquisa, filtro por categoria e indicador de estoque, mas não detalha: se o modal permite seleção múltipla, como se confirma a seleção, o que acontece ao cancelar, se há validação de quantidade disponível no momento da seleção.
   - **Para fechar:** Detalhar o fluxo completo do modal: seleção única ou múltipla, botões de confirmação/cancelamento, validações de quantidade no momento da seleção, feedback de erro se produto sem estoque.

18. **[MEDIA]** Cadastro auxiliar de Status não detalhado
   - **Localização:** Page 1 > Operacional > Anotações p/ UI e dev
   - **Categoria:** cobertura
   - **Descrição:** A anotação ¹ menciona que status são editáveis em 'Configurações (cadastro auxiliar)', mas não há detalhamento deste cadastro em nenhuma parte do trecho analisado.
   - **Para fechar:** Incluir no Discovery o detalhamento do cadastro de Status em Configurações: campos editáveis (nome, cor, se é status final, ordem de exibição), regras de exclusão, quem pode editar.

19. **[MEDIA]** Histórico automático sem formato definido
   - **Localização:** Page 1 > Operacional > Anotações p/ UI e dev
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A anotação ⁷ especifica que toda edição registra no histórico (campo, valor anterior, valor novo, usuário, timestamp), mas não define o formato de exibição, se há agrupamento por sessão de edição, ou como valores complexos (listas, objetos) são representados.
   - **Para fechar:** Definir o formato de exibição do histórico: se é tabela ou timeline, como agrupar múltiplas edições da mesma sessão, como representar valores não-textuais (ex: lista de produtos).

20. **[MEDIA]** Motivo de cancelamento sem definição de formato
   - **Localização:** Page 1 > Operacional > Regras
   - **Categoria:** pergunta_cliente
   - **Descrição:** A regra 'Cancelar OS exige motivo obrigatório (modal de confirmação)' não especifica se o motivo é texto livre, seleção de opções pré-definidas, ou combinação de ambos.
   - **Para fechar:** Definir com o cliente se o motivo de cancelamento deve ser: texto livre, dropdown com opções pré-definidas (e quais), ou seleção + campo adicional opcional.

21. **[MEDIA]** OS vencida sem definição de quando alerta
   - **Localização:** Page 1 > Operacional > Notificações
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A notificação 'OS com data programada vencida ainda em aberto → alerta visual em vermelho na lista' não define se o alerta aparece no mesmo dia da data programada ou a partir do dia seguinte.
   - **Para fechar:** Definir o momento exato em que a OS é considerada vencida: a partir da data programada (inclusive) ou a partir do dia seguinte (data programada < hoje).

22. **[MEDIA]** Versionamento simples não detalhado
   - **Localização:** 5.2.3 Anexos da Garantia
   - **Categoria:** cobertura
   - **Descrição:** Funcionalidade cita 'versionamento simples → ao subir arquivo com mesmo nome, mantém histórico das versões anteriores' mas não especifica: como usuário acessa versões anteriores? Há limite de versões mantidas? Versões antigas são editáveis/excluíveis? Como se visualiza o histórico?
   - **Para fechar:** Detalhar o comportamento do versionamento: interface para acessar versões, limite de retenção, permissões sobre versões antigas, e se a exclusão de um arquivo remove todas as versões ou apenas a atual.

23. **[MEDIA]** Meta de performance sem condições de contorno
   - **Localização:** Anotações p/ UI e dev (nota 12)
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Nota 12 define 'carregamento <2s por página' mas não especifica: em que ambiente (dev/prod)? Com que carga concorrente? Tamanho de página (quantos registros)? Conexão mínima? SLA ou best-effort?
   - **Para fechar:** Detalhar condições: tamanho padrão de página (ex: 50 registros), ambiente (prod), carga concorrente esperada, e se 2s é P95 ou média.

24. **[MEDIA]** Anexos como 'seção lateral' conflita com drawer de edição
   - **Localização:** Anotações p/ UI e dev (nota 9)
   - **Categoria:** inconsistencia
   - **Descrição:** Nota 9 diz 'Anexos passam a ser seção lateral integrada ao detalhe (não modal sobreposto)'. Mas nota 3 diz 'Edição de FUP é organizada em drawer lateral'. Se o detalhe da Garantia abre em drawer e anexos são seção lateral do detalhe, há dois níveis de drawer?
   - **Para fechar:** Esclarecer a hierarquia de UI: anexos são aba/seção dentro do drawer de detalhe da Garantia, ou são painel lateral separado que coexiste com o drawer? Definir comportamento responsivo.

25. **[MEDIA]** Notificação 'na primeira abertura' não define janela
   - **Localização:** Notificações
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** 'Cliente abriu o link público → notificação ao responsável na primeira abertura' não especifica: primeira abertura desde quando? Por sessão? Por geração de link? Se cliente abrir, fechar e reabrir após 1h, notifica de novo?
   - **Para fechar:** Definir escopo de 'primeira abertura': primeira vez absoluta desde geração do link, ou primeira abertura por sessão/dia?

26. **[MEDIA]** Portal do Cliente mencionado mas não detalhado
   - **Localização:** Impactos em outros módulos
   - **Categoria:** cobertura
   - **Descrição:** 'Link público de renovação roda em subdomínio do portal (mesma identidade visual)' cita Portal do Cliente mas não há seção/módulo detalhando suas funcionalidades, autenticação, URL, hospedagem.
   - **Para fechar:** Criar seção 'Portal do Cliente' detalhando: autenticação (ou ausência dela para links públicos), layout, responsividade, e como se integra com o backoffice.

27. **[MEDIA]** Indicador de preenchimento sem definição de cálculo
   - **Localização:** 3.1.3 Emitir ordem de serviço > Planos contratados
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** Menciona 'indicador (ex.: 3/5 pontos preenchidos)' nos chips de planos, mas não define como calcular o total de pontos, quais campos contam como 'preenchidos' ou qual a regra de validação.
   - **Para fechar:** Especificar: quais campos de cada tipo de plano contam como 'ponto', se campos opcionais contam, e qual o total esperado por tipo de controle (Armadilha Luminosa, Roedores, etc.).

28. **[MEDIA]** Indicador visual de documento vencido sem critério claro
   - **Localização:** 3.1.3 Emitir ordem de serviço > Gerenciar funcionários
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** Menciona 'Indicador visual de documento vencido' no modal de funcionários, mas não especifica: qual a regra de vencimento (exato na data, 1 dia antes, período de tolerância), nem qual o comportamento visual (cor, ícone, tooltip).
   - **Para fechar:** Definir: quando o documento é considerado vencido (data exata, antecedência), como será exibido (ícone, cor, posição) e se bloqueia a alocação do funcionário na OS.

29. **[MEDIA]** Indicadores de cotação sem metas ou thresholds
   - **Localização:** 6.2 Cotações
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Os indicadores 'Cotações em aberto', 'Cotações aguardando resposta de fornecedor' e 'Cotações prontas para aprovação' estão descritos mas não há valores-alvo, thresholds de alerta ou baseline de comparação definidos.
   - **Para fechar:** Definir para cada indicador: valor considerado normal/crítico, baseline histórica e se haverá alertas visuais ou automáticos quando ultrapassar limites.

30. **[MEDIA]** Período do indicador 'Valor total comprometido' não especificado
   - **Localização:** 6.3 Requisições de compras
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** O indicador 'Valor total comprometido no período' está descrito mas não define qual período (mês atual, últimos 30 dias, ano fiscal, configurável pelo usuário).
   - **Para fechar:** Definir qual período o indicador considera por padrão e se o usuário pode alterar esse filtro temporal.

31. **[MEDIA]** Formato e validação da nota fiscal obrigatória não definidos
   - **Localização:** 6.3 Requisições de compras
   - **Categoria:** pergunta_cliente
   - **Descrição:** O recebimento exige 'anexar nota fiscal (obrigatório)' mas não especifica: formatos aceitos (PDF, XML, imagem?), se há validação de chave de acesso, tamanho máximo ou integração com SEFAZ.
   - **Para fechar:** Definir com o cliente: formatos de arquivo aceitos, tamanho máximo, se haverá validação automática (ex: leitura de XML da NF-e) e regras de armazenamento.

32. **[MEDIA]** Conceito de fornecedor 'principal' não explorado
   - **Localização:** 6.4 Fornecedores
   - **Categoria:** inconsistencia
   - **Descrição:** A anotação diz 'produto pode ter múltiplos fornecedores, mas apenas um principal' porém não há funcionalidades descritas que usem esse conceito: o sistema prioriza o principal em cotações? Sugere-o por padrão? Impede inativação do principal?
   - **Para fechar:** Esclarecer implicações de ter um fornecedor principal: se ele é sugerido automaticamente em novas cotações, se há alertas ao tentar inativá-lo, ou se é apenas uma marcação informativa.

33. **[MEDIA]** Regra de 60 dias para vencimento não justificada ou configurável
   - **Localização:** 6.5 Estoque
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** O alerta de 'Lotes próximos do vencimento (laranja, 60 dias)' está fixo em 60 dias, mas não se sabe se esse prazo é adequado para todos os produtos ou se deveria ser configurável por tipo de produto.
   - **Para fechar:** Confirmar se 60 dias é padrão para todos os produtos ou se deve ser configurável por produto/categoria (ex: produtos perecíveis podem precisar de 90 dias).

34. **[MEDIA]** Nota de rodapé ¹¹ não definida
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3.1.c Contatos e Telefones (inline)¹¹
   - **Categoria:** inconsistencia
   - **Descrição:** A seção 3.1.c possui referência '(inline)¹¹' mas a nota ¹¹ não está definida em nenhum lugar do trecho fornecido.
   - **Para fechar:** Incluir a definição da nota ¹¹ ou remover a referência caso não seja necessária.

35. **[MEDIA]** Divergência de status de OS entre módulos
   - **Localização:** 7.2 Emitir relatórios técnicos
   - **Categoria:** inconsistencia
   - **Descrição:** Em 7.2 menciona status 'Executada / Concluída' para permitir relatório técnico, mas em 3.1.3 o fluxo tem 10 situações diferentes (Emitir, Executado, Finalizar, etc.) sem mapear qual situação corresponde a 'Executada' ou 'Concluída'.
   - **Para fechar:** Alinhar nomenclatura de status entre módulos 3.1.3, 4.1.1 e 7.2, ou mapear explicitamente quais situações do fluxo 3.1.3 habilitam a emissão de relatório técnico.

36. **[MEDIA]** Comparação de versões sem especificação de UI
   - **Localização:** 7.2 Emitir relatórios técnicos > Histórico de versões
   - **Categoria:** cobertura
   - **Descrição:** Menciona 'Comparar versões (lado a lado)' mas não detalha: se é diff textual, visual, se destaca apenas alterações ou exibe documento completo, nem qual formato (PDF, tabela, modal).
   - **Para fechar:** Especificar: tipo de visualização (diff linha a linha, PDF lado a lado), se destaca alterações com cor, se permite exportar comparação e qual o formato final.

### Severidade baixa

1. **[BAIXA]** Tempo médio no sistema sem referência
   - **Localização:** Page 1 > Discovery Corporativo > Adoção e engajamento
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Tempo médio no sistema' sem contexto se mais tempo é melhor ou pior, nem baseline ou meta.
   - **Para fechar:** Esclarecer: objetivo da métrica (eficiência vs profundidade de uso) e estabelecer baseline/meta.

2. **[BAIXA]** Expansão de mercado sem segmentos ou meta
   - **Localização:** Page 1 > Discovery Corporativo > Crescimento
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Expansão de mercado' sem definir novos segmentos/regiões alvo ou meta de crescimento.
   - **Para fechar:** Especificar segmentos/regiões prioritários e meta de crescimento para cada.

3. **[BAIXA]** Engajamento com suporte sem direção
   - **Localização:** Page 1 > Discovery Corporativo > Cancelamento e customer success
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Métrica 'Número de interações com suporte' sem esclarecer se mais ou menos interações é desejável, nem baseline/meta.
   - **Para fechar:** Esclarecer objetivo (reduzir tickets ou aumentar proatividade) e definir baseline/meta.

4. **[BAIXA]** Pautas de R3, R4 e R5 não detalhadas
   - **Localização:** Page 1 > Discovery Corporativo > Planejamento das reuniões
   - **Categoria:** cobertura
   - **Descrição:** As reuniões R3, R4 e R5 citam 'Módulo 1', 'Módulo 2' até 'Módulo 9' mas não especificam quais módulos são esses.
   - **Para fechar:** Nomear explicitamente cada módulo ou referenciar o mapeamento de módulos já existente no Discovery.

5. **[BAIXA]** Código de cores mencionado mas não explicado
   - **Localização:** Page 1 > Discovery Corporativo > Mapeamento de módulos e funcionalidades
   - **Categoria:** cobertura
   - **Descrição:** Existe um item 'Código de cores' sem nenhuma legenda ou descrição associada.
   - **Para fechar:** Incluir a legenda do código de cores ou remover a referência se não for aplicável.

6. **[BAIXA]** Regra de política de senha repetida em dois lugares
   - **Localização:** Page 1 > Mapeamento de módulos > Ambiente Backoffice > Autenticação
   - **Categoria:** inconsistencia
   - **Descrição:** A regra 'senhas mais fortes (8-16 caracteres, com pelo menos um número, uma letra e um caractere especial)' aparece tanto em 'Critérios de aceite' quanto em 'Anotações p/ UI e dev'.
   - **Para fechar:** Consolidar regras de negócio em um único local (preferencialmente Critérios de aceite) para evitar divergências futuras.

7. **[BAIXA]** Upload de croqui sem limites de tamanho ou formato
   - **Localização:** Page 1 > Operacional > 4.2.1 Vincular produtos e dados
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** O upload de 'Mapa de Pontos em PDF ou imagem' não especifica limite de tamanho de arquivo, formatos de imagem aceitos (JPG, PNG, etc.), nem se permite múltiplos arquivos ou apenas um.
   - **Para fechar:** Definir: formatos de imagem aceitos, tamanho máximo do arquivo, se permite upload de múltiplos croquis ou apenas um por OS.

8. **[BAIXA]** Badge colorido de status sem mapeamento de cores
   - **Localização:** Page 1 > Operacional > Anotações p/ UI e dev
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A anotação ¹ menciona status com badge colorido (em aberto, em andamento, executada, concluída, cancelada) e que são editáveis em Configurações, mas não mapeia qual cor corresponde a qual status.
   - **Para fechar:** Definir o mapeamento cor-status padrão (ex: cinza=em aberto, azul=em andamento, verde=concluída) ou confirmar se será configurável e qual o padrão inicial.

9. **[BAIXA]** Terminologia inconsistente: OS avulsa vs. Avulsa
   - **Localização:** Page 1 > Operacional > Anotações p/ UI e dev
   - **Categoria:** inconsistencia
   - **Descrição:** A anotação ² usa 'OS avulsa' e depois 'Avulsa' como etiqueta na tabela, enquanto a seção 5.2 usa 'Garantias de OS Avulsas'. Não está claro se 'avulsa' é um tipo específico de OS ou apenas uma OS criada sem orçamento de origem.
   - **Para fechar:** Padronizar a terminologia: definir se 'Avulsa' é um tipo de serviço específico ou apenas uma origem de criação, e usar o termo de forma consistente em todo o Discovery.

10. **[BAIXA]** Renomear inline diverge do padrão de confirmação
   - **Localização:** 5.2.3 Anexos da Garantia
   - **Categoria:** inconsistencia
   - **Descrição:** A funcionalidade define 'Renomear → edição inline' enquanto 'Excluir → modal de confirmação'. Não há padrão claro: por que renomear não exige confirmação se pode causar perda de referência (arquivo referenciado por nome em outros lugares)?
   - **Para fechar:** Validar se edição inline de nome é suficiente ou se deve exigir confirmação. Se mantiver inline, documentar que não há validação de duplicidade ou referências quebradas.

11. **[BAIXA]** Volume de 9k registros sem validação
   - **Localização:** Critérios de aceite
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Critério cita '~9k registros' como baseline de volume mas não especifica fonte (sistema atual? projeção?) nem crescimento esperado (quantos registros/ano?).
   - **Para fechar:** Validar com cliente: 9k é volume atual ou estimado no go-live? Qual taxa de crescimento anual? Isso afeta estratégia de indexação e particionamento.

12. **[BAIXA]** Indicadores do dashboard sem baseline ou metas
   - **Localização:** 7 Relatórios > Hub
   - **Categoria:** metrica_sem_meta
   - **Descrição:** Cita indicadores no topo (Total de relatórios emitidos, Agendamentos recorrentes ativos, etc.) mas não define valores de referência, metas ou periodicidade padrão de cálculo.
   - **Para fechar:** Especificar para cada indicador: período padrão de cálculo, se há meta/alerta esperado e se há comparação com período anterior.

13. **[BAIXA]** Dados bancários sem validação ou formato especificado
   - **Localização:** 6.4 Fornecedores
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** O cadastro de fornecedor inclui 'Dados bancários' mas não define quais campos (banco, agência, conta, tipo de conta, PIX?), se há validação de formato ou se é texto livre.
   - **Para fechar:** Especificar campos de dados bancários: estrutura (banco, agência, conta, dígito), validações (ex: módulo 11 para conta) e se aceita chave PIX.

14. **[BAIXA]** Nota de rodapé ¹ (total de registros) sem referência explícita
   - **Localização:** Page 1 > Gestão de Clientes > Funcionalidades > 3 Gestão de Clientes
   - **Categoria:** criterio_nao_testavel
   - **Descrição:** A funcionalidade menciona 'Exibir total de registros encontrados¹' mas a nota ¹ não está definida neste trecho, apenas nas anotações de UI onde fala de 2.115 registros e paginação.
   - **Para fechar:** Consolidar a informação sobre exibição de total de registros diretamente na descrição da funcionalidade ou garantir que todas as notas de rodapé estejam claramente referenciadas e definidas.
