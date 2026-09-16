-- ============================================================================
-- Desfaz supabase/seed/demo_seed.sql
-- ============================================================================
-- Apaga só o que o seed de demonstração criou. Os quatro ids são fixos, então
-- a remoção é exata: nenhuma OS de QA ou de teste de outra pessoa é tocada.
--
-- O bloco 4 do seed foi o único que alterou dado preexistente (preencheu os
-- pontos dos planos de controle que estavam zerados). Aqui isso volta ao
-- estado anterior: pontos apagados e `pontos_previstos` de volta a 0.
-- ============================================================================

begin;

-- Pontos dos planos — os criados pelo seed são exatamente os que seguem o
-- padrão 'PC-NN' e nunca foram preenchidos por ninguém.
delete from os_plano_pontos
 where preenchido_em is null
   and preenchido_por is null
   and identificacao ~ '^PC-[0-9]{2}$';

update os_planos_controle p
   set pontos_previstos = 0
 where p.id <> 'de000000-0000-4000-8000-0000000000a1'
   and not exists (select 1 from os_plano_pontos pt where pt.plano_id = p.id);

delete from os_planos_controle
 where id = 'de000000-0000-4000-8000-0000000000a1'
    or os_id in ('de000000-0000-4000-8000-000000000001',
                 'de000000-0000-4000-8000-000000000002',
                 'de000000-0000-4000-8000-000000000003',
                 'de000000-0000-4000-8000-000000000004');

-- Níveis de estoque criados pelo seed: os da base Central. Se alguém tiver
-- editado um nível pela tela depois, esta linha o apaga junto — por isso o
-- rollback só deve ser usado enquanto o seed for descartável.
delete from estoque_niveis
 where base_id = 'b3748e4b-ef57-4100-ba78-3cdd714239d7';

-- As OS: filhos primeiro, porque nem toda FK é on delete cascade.
delete from os_produtos     where os_id in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');
delete from os_funcionarios where os_id in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');
delete from os_historico    where os_id in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');
delete from os_anexos       where os_id in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');
delete from os_relatorios   where os_id in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');
delete from os_cronograma   where os_id in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');
delete from notificacoes    where os_id in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');
delete from ordens_servico  where id    in ('de000000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000003','de000000-0000-4000-8000-000000000004');

commit;
