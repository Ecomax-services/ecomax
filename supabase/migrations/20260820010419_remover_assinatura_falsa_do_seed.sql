-- O seed do Operacional (20260723124115) marcava as OS executadas com
-- `assinatura_url = 'seed/assinatura-demo.png'`, um caminho que nunca teve
-- arquivo no bucket. A tela então dizia "Assinatura: Coletada" para algo que
-- não foi coletado — o Backoffice só não exibe imagem quebrada porque cai no
-- rótulo "(arquivo indisponível)".
--
-- É a mesma classe do defeito já corrigido no app do operador, onde a
-- assinatura era uma URL inventada sem upload: a regra "assinatura obrigatória
-- para executar" ficava satisfeita por uma string. Aqui o efeito é só de
-- exibição, mas dado de demonstração que mente atrapalha o QA mais do que dado
-- faltando — sem assinatura, a tela mostra "Assinatura pendente", que é a
-- verdade sobre essas OS.
--
-- Corrigido aqui, e não editando o seed, porque aquela migration já está
-- aplicada: histórico de migration é log, acrescenta-se.
--
-- Só as apontando para o caminho do seed: assinaturas reais, enviadas pelo app,
-- ficam onde estão.
update ordens_servico
   set assinatura_url = null
 where assinatura_url = 'seed/assinatura-demo.png';
