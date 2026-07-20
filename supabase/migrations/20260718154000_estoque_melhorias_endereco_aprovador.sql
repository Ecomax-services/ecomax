-- Endereço no cadastro de base (crit. 17)
alter table public.bases add column if not exists cep text;
alter table public.bases add column if not exists logradouro text;
alter table public.bases add column if not exists numero text;
alter table public.bases add column if not exists complemento text;
alter table public.bases add column if not exists bairro text;

-- Aprovação em 2 níveis: aprovador designado + registro de quem/quando aprovou (crit. 8)
alter table public.requisicoes add column if not exists aprovador_id uuid references public.funcionarios(id);
alter table public.requisicoes add column if not exists aprovado_por uuid references auth.users(id);
alter table public.requisicoes add column if not exists aprovado_em timestamptz;
