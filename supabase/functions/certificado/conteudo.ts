/**
 * Conteúdo do certificado de execução — sem rede, para testar fora da função.
 *
 * Segue o certificado do App aprovado (28/09): contratada, registros e
 * licenças, contratante, serviço executado, produtos utilizados, CEATOX,
 * responsável técnico, três assinaturas e a validação pelo código da OS.
 *
 * O `snapshot` é exatamente o que sai impresso. Ele é gravado em
 * `os_certificados` e o PDF é desenhado a partir dele — se o cadastro da
 * empresa ou do RT mudar depois, o certificado emitido continua igual.
 */

export interface DadosCertificado {
  os: {
    id: string;
    codigo: string;
    status: string;
    tipos: string[];
    pragas: string[];
    inicio: string | null;
    termino: string | null;
    contato: string | null;
    endereco: string | null;
    assinaturaPath: string | null;
    assinanteNome: string | null;
    tecnicoAssinaturaPath: string | null;
  };
  cliente: { nome: string; endereco: string; telefone: string | null };
  empresa: { razaoSocial: string | null; cnpj: string | null; endereco: string | null; contato: string | null; ceatox: string | null; logoPath: string | null } | null;
  licencas: { rotulo: string; descricao: string }[];
  rt: { id: string; nome: string; formacao: string | null; conselho: string | null; registro: string | null; assinaturaPath: string | null } | null;
  tecnico: { nome: string } | null;
  produtos: { nome: string; categoria: string | null; registro: string | null; lote: string | null; quantidade: number | null; unidade: string | null; tecnica: string | null }[];
  /** Dias de validade por tipo de serviço (`catalogo_itens.validade_certificado_dias`). */
  validades: Record<string, number | null>;
}

export interface Snapshot {
  versao: 1;
  numero: string;
  titulo: string;
  modelo: string;
  emitidoEm: string;
  validade: string;
  contratada: [string, string][];
  licencas: [string, string][];
  contratante: [string, string][];
  servico: [string, string][];
  produtos: { nome: string; resumo: string; ficha: [string, string][] }[];
  ceatox: string;
  responsavelTecnico: string;
  assinaturas: { papel: string; nome: string; caminho: string | null; bucket: 'operacional-docs' | 'institucional' }[];
  logoPath: string | null;
  rodape: string;
}

export const STATUS_EXECUTADOS = ['executada', 'concluida'];

/** "04009610000107" → "04.009.610/0001-07"; CPF também. Outro formato passa como está. */
export function documentoFormatado(doc: string | null): string | null {
  if (!doc) return null;
  const d = doc.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return doc;
}

/** Dia e hora em Brasília: { data: "11/08/2026", hora: "08:30", iso: "2026-08-11" }. */
export function emBrasilia(instante: string): { data: string; hora: string; iso: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(instante)).map((x) => [x.type, x.value]),
  );
  return { data: `${p.day}/${p.month}/${p.year}`, hora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}`, iso: `${p.year}-${p.month}-${p.day}` };
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const br = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Validade em dias para os tipos da OS. Um tipo sem validade cadastrada
 * impede a emissão (`null`).
 *
 * [A DEFINIR — com o cliente: qual validade vale quando a OS tem vários
 * tipos. Até lá, a menor — o certificado nunca promete mais do que o serviço
 * de menor duração cobre.]
 */
export function validadeDias(tipos: string[], validades: Record<string, number | null>): number | null {
  if (tipos.length === 0) return null;
  const dias = tipos.map((t) => validades[t] ?? null);
  if (dias.some((d) => d == null)) return null;
  return Math.min(...(dias as number[]));
}

/**
 * O que impede a emissão. Lista vazia = pode emitir. Cada item é uma frase
 * para quem vai corrigir (escritório ou técnico).
 */
export function faltas(d: DadosCertificado): string[] {
  const f: string[] = [];
  if (!STATUS_EXECUTADOS.includes(d.os.status) || !d.os.termino) f.push('A OS ainda não foi executada pelo App.');
  const e = d.empresa;
  const empresaFalta = [
    !e?.razaoSocial && 'razão social', !e?.cnpj && 'CNPJ', !e?.endereco && 'endereço',
    !e?.contato && 'contato', !e?.ceatox && 'telefone do CEATOX',
  ].filter(Boolean);
  if (empresaFalta.length) f.push(`Dados da empresa incompletos: ${empresaFalta.join(', ')}.`);
  if (d.licencas.length === 0) f.push('Nenhum registro ou licença da empresa cadastrado.');
  if (!d.rt) f.push('Nenhum responsável técnico vigente cadastrado.');
  else {
    if (!d.rt.conselho || !d.rt.registro) f.push('O responsável técnico está sem conselho ou número de registro.');
    if (!d.rt.assinaturaPath) f.push('O responsável técnico está sem assinatura cadastrada.');
  }
  const semValidade = d.os.tipos.filter((t) => d.validades[t] == null);
  if (d.os.tipos.length === 0) f.push('A OS não tem tipo de serviço.');
  else if (semValidade.length) f.push(`Validade do certificado não definida para: ${semValidade.join(', ')}.`);
  if (!d.os.assinaturaPath || !d.os.assinanteNome) f.push('Falta a assinatura do cliente.');
  if (!d.os.tecnicoAssinaturaPath) f.push('Falta a assinatura do técnico.');
  return f;
}

const qtd = (n: number | null, u: string | null) => (n == null ? '' : `${n.toLocaleString('pt-BR')}${u ? ` ${u}` : ''}`);

/** Monta o que vai impresso. Só chamar com `faltas(d)` vazio. */
export function montarSnapshot(d: DadosCertificado, emitidoEm: string): Snapshot {
  const e = d.empresa!;
  const rt = d.rt!;
  const execucao = emBrasilia(d.os.inicio ?? d.os.termino!);
  const dias = validadeDias(d.os.tipos, d.validades)!;
  // Conta do dia da execução, como a prévia do App (EtapaEmissao).
  const validade = somarDias(execucao.iso, dias);
  const servico = d.os.tipos.join(', ');
  const rtTexto = [rt.nome, rt.formacao, `${rt.conselho} ${rt.registro}`].filter(Boolean).join(' · ');

  return {
    versao: 1,
    numero: d.os.codigo,
    titulo: `Certificado de Execução (${servico})`,
    modelo: 'Modelo R-SGI-023 · Controle de pragas urbanas',
    emitidoEm,
    validade,
    contratada: [
      ['Razão social', e.razaoSocial!],
      ['CNPJ', documentoFormatado(e.cnpj)!],
      ['Endereço', e.endereco!],
      ['Contato', e.contato!],
    ],
    licencas: d.licencas.map((l) => [l.rotulo, l.descricao]),
    // Como no certificado aprovado: razão social, endereço e contato. Sem CPF
    // nem CNPJ do contratante (pedido da Ecomax na aprovação, 06/10/2026).
    contratante: [
      ['Razão social', d.cliente.nome],
      ['Endereço', d.os.endereco || d.cliente.endereco],
      ['Contato', d.os.contato || d.cliente.telefone || '—'],
    ],
    servico: [
      ['Nº da OS', d.os.codigo],
      ['Serviço', servico],
      ['Praga-alvo', d.os.pragas.join(', ') || '—'],
      ['Execução', `${execucao.data} às ${execucao.hora}`],
      ['Validade', `${br(validade)} (${dias} dias)`],
    ],
    // [A DEFINIR — ficha do produto: o certificado aprovado imprime classe,
    // fabricante, grupo químico, princípio ativo, concentração e registro MS.
    // O cadastro de produto só tem categoria e registro; os outros campos
    // entram quando existirem no Backoffice. Linha sem dado não é impressa.]
    produtos: d.produtos.map((p) => ({
      nome: p.nome,
      resumo: [p.lote ? `Lote ${p.lote}` : null, qtd(p.quantidade, p.unidade) || null].filter(Boolean).join(' · '),
      ficha: ([
        ['Classe', p.categoria],
        ['Registro MS', p.registro],
        ['Técnica de aplicação', p.tecnica],
      ] as [string, string | null][]).filter((l): l is [string, string] => !!l[1]),
    })),
    ceatox: e.ceatox!,
    responsavelTecnico: rtTexto,
    assinaturas: [
      // Só o nome: CPF e cargo do cliente saíram do certificado na aprovação da
      // Release 4 (e-mail de 06/10/2026).
      { papel: 'Cliente', nome: d.os.assinanteNome!, caminho: d.os.assinaturaPath, bucket: 'operacional-docs' },
      { papel: 'Técnico executor', nome: d.tecnico?.nome ?? '—', caminho: d.os.tecnicoAssinaturaPath, bucket: 'operacional-docs' },
      { papel: `Responsável técnico · ${rt.conselho} ${rt.registro}`, nome: rt.nome, caminho: rt.assinaturaPath, bucket: 'institucional' },
    ],
    logoPath: e.logoPath,
    rodape: `Documento gerado pelo app Ecomax Operador. Validação pelo código ${d.os.codigo}.`,
  };
}

const VERDE = '#1d6b25';
const CINZA = '#686f7d';
const CLARO = '#959ba7';
const TINTA = '#151619';

const secao = (t: string) => ({ text: t, fontSize: 7.5, bold: true, color: CLARO, characterSpacing: 0.6, margin: [0, 9, 0, 2] });

const tabela = (linhas: [string, string][], larguraRotulo = 110) => ({
  table: {
    widths: [larguraRotulo, '*'],
    body: linhas.map(([r, v]) => [{ text: r, color: CLARO, fontSize: 8 }, { text: v, color: TINTA, fontSize: 8.5 }]),
  },
  layout: {
    hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => '#eef0ee',
    paddingTop: () => 2.5,
    paddingBottom: () => 2.5,
    paddingLeft: () => 0,
  },
});

/**
 * Definição do documento para o pdfmake. `imagens` traz as figuras já em
 * data URL: logo e as três assinaturas (na ordem do snapshot); `null` deixa a
 * linha em branco para assinar à mão.
 */
export function documento(s: Snapshot, imagens: { logo: string; assinaturas: (string | null)[] }) {
  return {
    pageSize: 'A4',
    pageMargins: [36, 30, 36, 40],
    info: { title: `Certificado ${s.numero}`, author: 'Ecomax', subject: s.titulo, creationDate: new Date(s.emitidoEm) },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: TINTA, lineHeight: 1.2 },
    footer: (pagina: number, total: number) => ({ text: `Página ${pagina} de ${total}`, alignment: 'center', fontSize: 7.5, color: CLARO, margin: [0, 14, 0, 0] }),
    content: [
      {
        columns: [
          { image: imagens.logo, fit: [110, 36] },
          { stack: [{ text: 'CERTIFICADO', fontSize: 8, bold: true, color: CLARO, characterSpacing: 0.6 }, { text: s.numero, fontSize: 12, bold: true }], alignment: 'right' },
        ],
      },
      { text: s.titulo, fontSize: 14, bold: true, margin: [0, 10, 0, 1] },
      { text: s.modelo, fontSize: 8.5, color: CINZA },

      secao('CONTRATADA'), tabela(s.contratada),
      secao('REGISTROS E LICENÇAS'), tabela(s.licencas, 150),
      secao('CONTRATANTE'), tabela(s.contratante),
      secao('SERVIÇO EXECUTADO'), tabela(s.servico),

      ...(s.produtos.length ? [
        secao('PRODUTOS UTILIZADOS'),
        ...s.produtos.map((p) => ({
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: p.nome, bold: true, fontSize: 9.5 },
                ...(p.resumo ? [{ text: p.resumo, color: CINZA, fontSize: 8.5, margin: [0, 1, 0, 3] }] : []),
                ...(p.ficha.length ? [tabela(p.ficha, 110)] : []),
              ],
            }]],
          },
          layout: { hLineColor: () => '#eceeec', vLineColor: () => '#eceeec', hLineWidth: () => 0.6, vLineWidth: () => 0.6, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6 },
          margin: [0, 0, 0, 6],
        })),
      ] : []),

      {
        table: { widths: ['*'], body: [[{ stack: [{ text: 'CENTRO DE CONTROLE DE INTOXICAÇÃO', fontSize: 8, bold: true, color: VERDE }, { text: s.ceatox, margin: [0, 2, 0, 0] }] }]] },
        layout: { fillColor: () => '#eef8ee', hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 8, paddingTop: () => 6, paddingBottom: () => 6 },
        margin: [0, 8, 0, 0],
      },
      {
        table: { widths: ['*'], body: [[{ stack: [{ text: 'RESPONSÁVEL TÉCNICO', fontSize: 8, bold: true, color: CLARO }, { text: s.responsavelTecnico, margin: [0, 2, 0, 0] }] }]] },
        layout: { fillColor: () => '#f6f7f6', hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 8, paddingTop: () => 6, paddingBottom: () => 6 },
        margin: [0, 6, 0, 0],
      },
      { text: 'Serviço executado conforme o relatório técnico de monitoramento desta ordem.', fontSize: 8, color: CINZA, margin: [0, 8, 0, 0] },

      {
        // Título e assinaturas não se separam na quebra de página.
        unbreakable: true,
        stack: [secao('ASSINATURAS'), {
        columns: s.assinaturas.map((a, i) => ({
          stack: [
            imagens.assinaturas[i] ? { image: imagens.assinaturas[i]!, fit: [140, 40], alignment: 'center' } : { text: ' ', margin: [0, 0, 0, 34] },
            { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 150, y2: 2, lineWidth: 0.6, lineColor: '#c8ccc8' }], margin: [0, 2, 0, 3] },
            { text: a.nome, bold: true, fontSize: 8.5 },
            { text: a.papel, fontSize: 7.5, color: CLARO },
          ],
        })),
        columnGap: 12,
      }],
      },
      { text: s.rodape, fontSize: 7.5, color: CLARO, alignment: 'center', margin: [0, 12, 0, 0] },
    ],
  };
}
