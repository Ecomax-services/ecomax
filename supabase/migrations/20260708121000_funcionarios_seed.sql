-- Seed inicial de funcionários (dados de demonstração).
-- Colaboradores começam sem login (profile_id null / "Sem credenciais"); credenciais são
-- criadas depois via o fluxo de Cadastro (Edge Function funcionarios-admin).
-- Datas de ASO/CNH coerentes com a derivação de estado no front (expired < hoje, soon <= 30d).

insert into public.funcionarios
  (nome_completo, cpf, cargo, setor, ativo, aso_validade, cnh_numero, cnh_categoria, cnh_validade, telefone)
values
  ('Eliana Martins',        '111.222.333-44', 'Gestora Operacional', 'Operações',      true,  null,         null, null, null,        '(11) 99000-0001'),
  ('Marina Lopes Ferreira', '405.118.227-66', 'Supervisora',         'Operações',      true,  '2026-07-30', null, null, null,        '(11) 99000-0002'),
  ('Carlos Henrique Souza', '321.456.789-01', 'Técnico de Campo',    'Operações',      true,  '2026-12-03', '01234567890', 'B', '2026-07-25', '(11) 99000-0003'),
  ('João Pedro Almeida',    '278.903.114-50', 'Técnico de Campo',    'Operações',      true,  '2026-01-02', '02345678901', 'B', '2026-09-15', '(11) 99000-0004'),
  ('Beatriz Santos Rocha',  '190.554.882-33', 'Analista Admin.',     'Administrativo', true,  null,         null, null, null,        '(11) 99000-0005'),
  ('Rafael Oliveira Lima',  '512.667.013-29', 'Técnico de Campo',    'Operações',      true,  '2026-10-30', '03456789012', 'D', '2025-12-04', '(11) 99000-0006'),
  ('Patrícia Gomes Dias',   '847.220.591-04', 'Almoxarife',          'Almoxarifado',   false, '2026-11-11', null, null, null,        '(11) 99000-0007'),
  ('Lucas Fernandes Reis',  '633.901.447-18', 'Técnico de Campo',    'Operações',      true,  '2026-08-22', '04567890123', 'AB','2027-07-19', '(11) 99000-0008')
on conflict (cpf) do nothing;

-- Vínculo de gestão (self-ref)
update public.funcionarios
  set gestor_id = (select id from public.funcionarios where cpf = '111.222.333-44')
  where cpf in ('405.118.227-66', '321.456.789-01', '190.554.882-33', '847.220.591-04');

update public.funcionarios
  set gestor_id = (select id from public.funcionarios where cpf = '405.118.227-66')
  where cpf in ('278.903.114-50', '512.667.013-29', '633.901.447-18');
