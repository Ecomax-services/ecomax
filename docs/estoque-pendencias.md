# Estoque e Produtos — Pendências e dependências

Status do módulo após as frentes A–D (2026-07-18). O núcleo está **real, conectado ao
Supabase e verificado** (typecheck/build, RLS por `has_module_perm('estoque',…)`, e teste
end-to-end da transferência em trânsito). Este documento registra o que **ainda falta** frente
aos 25 critérios de aceite do Discovery e **de qual módulo cada gap depende**, para não ficar vago.

## ✅ Concluído nesta rodada (A–D)

- **A — Mín/máx por localização** (critérios 3, 12, 23): tabela `estoque_niveis` (produto × base)
  com fallback ao padrão do produto; alertas de 6.5 usam o nível efetivo por localização; UI
  "Níveis" no Estoque (editar + replicar entre bases).
- **B — Transferência em trânsito** (critérios 18, 19): tabela `transferencias`
  (`em_transito`/`recebida`/`cancelada`); origem abatida no envio, destino creditado só na
  confirmação; divergência enviado×recebido exige justificativa (auditada). UI no Inventário.
- **C — Fornecedor completo** (critérios 10, 11): `fornecedor_contatos` (múltiplos),
  `fornecedor_produtos` (vínculo); avaliação **automática** calculada do histórico
  (`vw_fornecedores.avaliacao_calc`); abas Contatos/Produtos reais no detalhe.
- **D — NF obrigatória + inventário físico** (critérios 9, 15, 22): recebimento de requisição
  agora **exige** NF; `inventarios`/`inventario_itens` com contagem sistema×física por
  localização e ajustes restritos à base ao fechar.
- **Melhorias não-bloqueadas** (2026-07-18): aprovação em **2 níveis reais** (crit. 8 — requisição
  tem `aprovador_id` designado + registro de `aprovado_por`/`aprovado_em`); **endereço** no
  cadastro de base (crit. 17 — cep/logradouro/número/complemento/bairro); **seleção de produtos**
  ao iniciar o inventário físico (6.5.b). Migration `20260718154000_*`.

## ⛔ Pendente — bloqueado por outros módulos ainda inexistentes

### 1. Depende do módulo **Operacional (Ordens de Serviço)** + app **mobile-operador**
Envolve o conceito de "operador em campo consumindo produto", que não existe até o Operacional/OS
e o app existirem.

| Critério | O que falta |
|---|---|
| 4  | 6.1 — enviar produto a operador (Ecomax/Base → Operador) e **consumo automático via app** durante a OS |
| 20 | Recarga **Base → Operador** com rastreio da base que abasteceu |
| 21 | Devolução **Operador → Base** (a ponta Base → Ecomax já é coberta pela transferência em trânsito) |
| 17 (parcial) | **Operadores vinculados** à base (o campo "responsável" já existe; falta a lista de operadores) |

> UI atual: a aba **"Por operador"** do Inventário mostra placeholder explicando a dependência.

### 2. Depende do módulo **Notificações** (hoje é tela mock)
A spec lista push/e-mail para vários eventos; nada dispara enquanto não houver um serviço real de
notificações (fila/worker + e-mail).

| Critério | O que falta |
|---|---|
| 16 | **Notificação automática** quando o produto atinge nível abaixo do mínimo (push + e-mail ao administrativo) |
| —  | Demais eventos do módulo: cotação sem resposta em X dias, requisição aprovada/recusada/recebida, transferência criada/parada, inventário fechado (todos push/e-mail) |

## 🔧 Pendente — NÃO bloqueado (restantes)

Já entregues: aprovação em 2 níveis (8), endereço da base (17), seleção de produtos no
inventário (6.5.b) — ver seção "Concluído". Restam apenas refinamentos menores:

| Critério | O que falta | Esforço |
|---|---|---|
| 6.2 | Anexar PDF/observações e prazo de resposta na cotação (campos extras da spec) | Baixo |

## Referência
- Migrations desta rodada: `20260718150000_estoque_niveis_por_localizacao.sql`,
  `..151000_transferencias_em_transito.sql`, `..152000_fornecedor_contatos_produtos_avaliacao.sql`,
  `..153000_inventario_fisico.sql`.
- Camada de dados: `apps/web-backoffice/src/lib/estoque.ts`.
- Telas: `apps/web-backoffice/src/pages/estoque/*`.
