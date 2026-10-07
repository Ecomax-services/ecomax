// Testes do conteúdo do certificado. Rodar:
//   deno test supabase/functions/certificado/
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { DadosCertificado, documento, documentoFormatado, faltas, montarSnapshot, validadeDias } from './conteudo.ts';
import { gerarPdf } from '../_shared/pdf.ts';
import { LOGO_PADRAO } from '../_shared/logo.ts';

function dados(): DadosCertificado {
  return {
    os: {
      id: 'os-1', codigo: 'OS-1050', status: 'executada', tipos: ['Desratização'], pragas: ['Ratos', 'Camundongos'],
      inicio: '2026-08-11T11:30:00Z', termino: '2026-08-11T13:10:00Z', contato: null, endereco: null,
      assinaturaPath: 'os/os-1/assinatura/cliente.png', assinanteNome: 'Ana Ribeiro',
      tecnicoAssinaturaPath: 'os/os-1/assinatura/tecnico.png',
    },
    cliente: { nome: '[EXEMPLO] Cliente', endereco: 'Rua A, 10 · Sorocaba/SP', telefone: '(15) 3232-0000' },
    empresa: { razaoSocial: 'ECOMAX SERVICOS AMBIENTAIS LTDA', cnpj: '04009610000107', endereco: '[EXEMPLO] endereço', contato: '[EXEMPLO] contato', ceatox: '[EXEMPLO] CEATOX', logoPath: null },
    licencas: [{ rotulo: 'IBAMA', descricao: '[EXEMPLO] CTF nº 0' }],
    rt: { id: 'rt-1', nome: '[EXEMPLO] RT', formacao: 'Química responsável', conselho: 'CRQ', registro: '04-0000', assinaturaPath: 'rt/assinatura.png' },
    tecnico: { nome: '[EXEMPLO] Técnico' },
    produtos: [{ nome: 'Raticida Bloco', categoria: 'Raticida', registro: 'MS 3.0000', lote: 'L-1', quantidade: 0.3, unidade: 'KG', tecnica: null }],
    validades: { Desratização: 90, Sanitização: 180, Desinsetização: null },
  };
}

Deno.test('com tudo cadastrado não falta nada', () => {
  assertEquals(faltas(dados()), []);
});

Deno.test('lista o que falta, em frases para quem vai corrigir', () => {
  const d = dados();
  d.empresa = { ...d.empresa!, endereco: null, ceatox: null };
  d.licencas = [];
  d.rt = null;
  d.os.tipos = ['Desratização', 'Desinsetização'];
  d.os.assinaturaPath = null;
  assertEquals(faltas(d), [
    'Dados da empresa incompletos: endereço, telefone do CEATOX.',
    'Nenhum registro ou licença da empresa cadastrado.',
    'Nenhum responsável técnico vigente cadastrado.',
    'Validade do certificado não definida para: Desinsetização.',
    'Falta a assinatura do cliente.',
  ]);
});

Deno.test('OS não executada pelo App não emite', () => {
  const d = dados();
  d.os.termino = null;
  assertEquals(faltas(d)[0], 'A OS ainda não foi executada pelo App.');
});

Deno.test('validade: menor dos tipos; tipo sem validade bloqueia', () => {
  assertEquals(validadeDias(['Desratização', 'Sanitização'], dados().validades), 90);
  assertEquals(validadeDias(['Desinsetização'], dados().validades), null);
  assertEquals(validadeDias([], dados().validades), null);
});

Deno.test('snapshot: número é o código, validade conta do dia da execução em Brasília', () => {
  const s = montarSnapshot(dados(), '2026-08-11T13:15:00Z');
  assertEquals(s.numero, 'OS-1050');
  assertEquals(s.titulo, 'Certificado de Execução (Desratização)');
  assertEquals(s.validade, '2026-11-09');
  assertEquals(s.servico.find(([r]) => r === 'Execução')![1], '11/08/2026 às 08:30');
  assertEquals(s.servico.find(([r]) => r === 'Validade')![1], '09/11/2026 (90 dias)');
  assertEquals(s.contratada[1], ['CNPJ', '04.009.610/0001-07']);
  assertEquals(s.contratante.map(([r]) => r), ['Razão social', 'Endereço', 'Contato']);
  assertEquals(s.assinaturas.map((a) => a.papel), ['Cliente', 'Técnico executor', 'Responsável técnico · CRQ 04-0000']);
  assertEquals(s.assinaturas[2].bucket, 'institucional');
});

Deno.test('ficha do produto imprime só o que existe no cadastro', () => {
  const s = montarSnapshot(dados(), '2026-08-11T13:15:00Z');
  assertEquals(s.produtos[0].resumo, 'Lote L-1 · 0,3 KG');
  assertEquals(s.produtos[0].ficha, [['Classe', 'Raticida'], ['Registro MS', 'MS 3.0000']]);
});

Deno.test('documento formatado', () => {
  assertEquals(documentoFormatado('04009610000107'), '04.009.610/0001-07');
  assertEquals(documentoFormatado('12345678901'), '123.456.789-01');
  assertEquals(documentoFormatado(null), null);
});

Deno.test('o PDF sai com uma página e cabeçalho de PDF', async () => {
  const s = montarSnapshot(dados(), '2026-08-11T13:15:00Z');
  const pdf = await gerarPdf(documento(s, { logo: LOGO_PADRAO, assinaturas: [null, null, null] }));
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), '%PDF-');
  assert(pdf.length > 5000);
  const saida = Deno.env.get('CERTIFICADO_AMOSTRA');
  if (saida) await Deno.writeFile(saida, pdf);
});
