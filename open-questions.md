# Perguntas em aberto (open-questions.md)

Este documento consolida **87 gaps não resolvidos** identificados durante a análise do Discovery. Os itens estão organizados por severidade (Bloqueadores primeiro, depois Média e Baixa) e, dentro de cada grupo, por módulo/localização.

---

## Bloqueadores (37 itens)

### Métricas e Indicadores

#### 1. Produtividade sem baseline ou forma de medição
- **Localização:** Discovery Corporativo > Métricas selecionadas
- **O que está em aberto:** A métrica "Produtividade" (aumento na eficiência das equipes) é citada sem indicador específico, baseline ou meta quantitativa.
- **Impacto no desenvolvimento:** Impossível implementar dashboard de métricas ou validar se o sistema está gerando o ganho esperado.
- **Pergunta objetiva:** Como será medida a produtividade? Qual o indicador específico (ex: OS/hora/técnico)? Qual o valor atual e qual a meta de aumento percentual?
- **Quem deve responder:** Gestor operacional + Product Owner

#### 2. Taxa de adoção sem meta definida
- **Localização:** Discovery Corporativo > Métricas selecionadas
- **O que está em aberto:** A métrica "Taxa de adoção" é citada mas não possui valor-alvo, baseline atual ou prazo para atingimento.
- **Impacto no desenvolvimento:** Não há como validar sucesso do onboarding nem priorizar features que aumentem adoção.
- **Pergunta objetiva:** Qual a taxa de adoção atual (baseline)? Qual a meta esperada (ex: 90% em 6 meses) e em que prazo?
- **Quem deve responder:** Product Owner + Gestor de TI

#### 3. Tempo de processamento sem baseline ou meta
- **Localização:** Discovery Corporativo > Métricas selecionadas
- **O que está em aberto:** Métrica "Tempo de processamento" mencionada sem valor atual, meta de redução ou processos específicos sendo medidos.
- **Impacto no desenvolvimento:** Impossível medir impacto de automações ou priorizar otimizações.
- **Pergunta objetiva:** Quais processos serão medidos? Qual o tempo atual médio de cada um? Qual a meta de redução (ex: de 2h para 30min)?
- **Quem deve responder:** Analista de processos + Gestor operacional

#### 4. Quantidade de erros sem baseline ou meta
- **Localização:** Discovery Corporativo > Métricas selecionadas
- **O que está em aberto:** Métrica "Erros" citada sem quantificação atual, tipos de erros prioritários ou meta de redução.
- **Impacto no desenvolvimento:** Não há como validar se automações realmente reduziram erros operacionais.
- **Pergunta objetiva:** Quantos erros ocorrem hoje (por período/processo)? Quais tipos são críticos? Qual a meta (ex: reduzir em 80%)?
- **Quem deve responder:** Analista de qualidade + Gestor operacional

#### 5. Automação de processos sem percentual alvo
- **Localização:** Discovery Corporativo > Métricas selecionadas
- **O que está em aberto:** Métrica "% de processos manuais automatizados" sem definição de quantos processos existem, quantos são manuais hoje e qual meta.
- **Impacto no desenvolvimento:** Impossível priorizar quais processos automatizar primeiro ou medir ROI.
- **Pergunta objetiva:** Quantos processos manuais existem hoje? Quais são prioritários? Qual a meta de automação (ex: 70% nos primeiros 12 meses)?
- **Quem deve responder:** Analista de processos + Product Owner

#### 6. Usuários ativos sem baseline ou meta
- **Localização:** Discovery Corporativo > Adoção e engajamento
- **O que está em aberto:** Métrica "Usuários ativos diários" sem definição de quantos usuários existem hoje, quantos deveriam usar diariamente ou meta.
- **Impacto no desenvolvimento:** Não há como medir engajamento ou identificar usuários inativos.
- **Pergunta objetiva:** Quantos usuários existem no total? Quantos acessam o sistema hoje diariamente? Qual a meta de usuários ativos diários?
- **Quem deve responder:** Gestor de TI + RH

#### 7. Churn rate sem baseline ou meta
- **Localização:** Discovery Corporativo > Cancelamento e customer success
- **O que está em aberto:** Métrica "Churn rate" sem taxa atual de cancelamento ou meta aceitável.
- **Impacto no desenvolvimento:** Impossível validar se o sistema reduz cancelamentos ou medir impacto no customer success.
- **Pergunta objetiva:** Qual a taxa de churn atual? Quais as causas principais? Qual a meta de redução?
- **Quem deve responder:** Gestor comercial + Customer Success

#### 8. Health score sem metodologia ou meta
- **Localização:** Discovery Corporativo > Cancelamento e customer success
- **O que está em aberto:** Métrica "Health score" citada sem definir como será calculado, escala ou meta mínima.
- **Impacto no desenvolvimento:** Impossível implementar indicador de saúde do relacionamento com clientes.
- **Pergunta objetiva:** Como será calculado o health score? Qual a escala (ex: 0-100)? Qual a meta mínima (ex: >70)?
- **Quem deve responder:** Customer Success + Product Owner

#### 9. SLA de suporte sem tempo-alvo
- **Localização:** Discovery Corporativo > Operação
- **O que está em aberto:** Métrica "Tempo médio de resposta do suporte" sem definição de SLA alvo por prioridade.
- **Impacto no desenvolvimento:** Impossível configurar alertas de SLA ou medir qualidade do atendimento.
- **Pergunta objetiva:** Qual o SLA de resposta por prioridade (ex: crítico <1h, normal <24h)? Qual o baseline atual?
- **Quem deve responder:** Gestor de suporte + Qualidade

### Autenticação e Segurança

#### 10. Expiração de token de recuperação de senha não especificada
- **Localização:** Ambiente Backoffice > Autenticação
- **O que está em aberto:** O fluxo de recuperação de senha menciona envio de link por e-mail mas não define prazo de validade do token nem comportamento após expiração.
- **Impacto no desenvolvimento:** Time de backend não sabe qual lógica de expiração implementar; UX não define mensagem de erro.
- **Pergunta objetiva:** Qual o prazo de validade do token de recuperação de senha? O que acontece se o usuário tentar usar um token expirado (mensagem específica, novo envio automático)?
- **Quem deve responder:** Product Owner + Segurança da Informação

#### 11. Limite de tentativas de login não especificado
- **Localização:** Ambiente Backoffice > Autenticação
- **O que está em aberto:** Não há definição sobre bloqueio de conta após tentativas falhas de login.
- **Impacto no desenvolvimento:** Sistema fica vulnerável a ataques de força bruta; não há regra de desbloqueio.
- **Pergunta objetiva:** Haverá bloqueio por tentativas inválidas? Quantas tentativas são permitidas? Qual o tempo de bloqueio? Como desbloquear (automático, por admin, por e-mail)?
- **Quem deve responder:** Segurança da Informação + Product Owner

### Notificações

#### 12. Configurações de notificação citadas mas não detalhadas
- **Localização:** Ambiente Backoffice > Notificações
- **O que está em aberto:** Os critérios mencionam "configurações definidas, podendo ser emitidas in-app e/ou por e-mail" mas não há detalhamento de onde/como o usuário configura preferências.
- **Impacto no desenvolvimento:** Impossível construir a tela de configuração de notificações; não há definição de granularidade (por tipo, por módulo).
- **Pergunta objetiva:** Onde o usuário configura preferências de notificação? Quais opções ele pode escolher? Há configuração por tipo de notificação (OS, documentos, estoque) ou é global?
- **Quem deve responder:** Product Owner + UX

#### 13. Regras de quando emitir cada tipo de notificação não especificadas
- **Localização:** Ambiente Backoffice > Notificações
- **O que está em aberto:** Há exemplos de notificações ("Nova ordem de serviço", "Documentos próximos da validade", "Documentos expirados") mas não há definição de gatilhos, condições ou prazos para emissão.
- **Impacto no desenvolvimento:** Backend não sabe quando disparar cada notificação; não há regra de negócio implementável.
- **Pergunta objetiva:** Para cada tipo de notificação: qual o gatilho exato? Qual a condição de emissão? Qual o prazo antecedente (ex: documentos próximos = 30 dias antes)? Quem são os destinatários?
- **Quem deve responder:** Product Owner + Analista de processos

### Módulo Operacional

#### 14. Redirecionamento para módulo Comercial sem detalhamento
- **Localização:** Ambiente Backoffice > Operacional > Lista de orçamentos e OS
- **O que está em aberto:** A funcionalidade "Novo orçamento" redireciona para o módulo Comercial mas este módulo não foi detalhado no trecho fornecido.
- **Impacto no desenvolvimento:** Não há como implementar o botão "Novo orçamento" sem saber para onde direciona nem quais dados pré-preenche.
- **Pergunta objetiva:** Qual o fluxo completo de criação de orçamento no módulo Comercial? Quais dados são herdados da tela de origem? Há validações específicas?
- **Quem deve responder:** Product Owner (escopo do módulo Comercial deve ser detalhado em outro documento)

#### 15. Status de OS não listados
- **Localização:** Ambiente Backoffice > Operacional > Lista de orçamentos e OS
- **O que está em aberto:** Há referência a "Status (badge colorido)¹" mas a nota ¹ não aparece no trecho e não há lista dos status possíveis.
- **Impacto no desenvolvimento:** Impossível implementar a coluna de status sem saber quais valores existem nem suas cores.
- **Pergunta objetiva:** Quais são todos os status possíveis de OS e orçamento? Quais as cores/rótulos de cada um? Qual o fluxo de trans