import type { BadgeTone } from '@/components/ui/Badge';

export type AlertLevel = 'low' | 'high' | 'ok' | 'exp';

export const alertMeta: Record<AlertLevel, { label: string; tone: BadgeTone }> = {
  low: { label: 'Abaixo do mínimo', tone: 'danger' },
  high: { label: 'Acima do máximo', tone: 'warn' },
  exp: { label: 'Lote vencendo', tone: 'exp' },
  ok: { label: 'Normal', tone: 'success' },
};

export interface Produto {
  name: string;
  cod: string;
  cat: string;
  un: string;
  stock: number;
  min: number;
  max: number;
  forn: string;
  status: 'Ativo' | 'Inativo';
  alert: AlertLevel;
  noForn?: boolean;
}

export const PRODUCTS: Produto[] = [
  { name: 'Inseticida Permetrina 500ml', cod: 'INS-0500', cat: 'Inseticida', un: 'mL', stock: 8, min: 20, max: 120, forn: 'Química Brasil', status: 'Ativo', alert: 'low' },
  { name: 'Raticida Brodifacoum Blocos', cod: 'RAT-0120', cat: 'Raticida', un: 'kg', stock: 45, min: 15, max: 80, forn: 'PestControl Ltda', status: 'Ativo', alert: 'ok' },
  { name: 'Larvicida Pyriproxyfen 1L', cod: 'LAR-1000', cat: 'Larvicida', un: 'L', stock: 12, min: 10, max: 60, forn: 'Química Brasil', status: 'Ativo', alert: 'ok' },
  { name: 'Cupinicida Fipronil 250ml', cod: 'CUP-0250', cat: 'Inseticida', un: 'mL', stock: 140, min: 30, max: 120, forn: 'AgroDefensivos', status: 'Ativo', alert: 'high' },
  { name: 'Gel Formicida Profissional', cod: 'GEL-0030', cat: 'Inseticida', un: 'un', stock: 60, min: 25, max: 100, forn: '—', status: 'Ativo', alert: 'ok', noForn: true },
  { name: 'Desinfetante Quaternário 5L', cod: 'DES-5000', cat: 'Desinfetante', un: 'L', stock: 5, min: 12, max: 40, forn: 'CleanMax', status: 'Inativo', alert: 'low' },
  { name: 'Inseticida Piretroide Concentrado 1L', cod: 'INS-1000', cat: 'Inseticida', un: 'L', stock: 34, min: 15, max: 70, forn: 'Química Brasil', status: 'Ativo', alert: 'ok' },
  { name: 'Mosquicida Aquoso 5L', cod: 'MOS-5000', cat: 'Larvicida', un: 'L', stock: 7, min: 10, max: 45, forn: 'AgroDefensivos', status: 'Ativo', alert: 'low' },
  { name: 'Isca Granulada Formicida 500g', cod: 'ISC-0500', cat: 'Inseticida', un: 'g', stock: 320, min: 100, max: 600, forn: 'PestControl Ltda', status: 'Ativo', alert: 'ok' },
  { name: 'Raticida Bromadiolona Pellets', cod: 'RAT-0210', cat: 'Raticida', un: 'kg', stock: 96, min: 20, max: 80, forn: 'PestControl Ltda', status: 'Ativo', alert: 'high' },
  { name: 'Armadilha Adesiva para Roedores', cod: 'ARM-0012', cat: 'Equipamento', un: 'un', stock: 210, min: 60, max: 400, forn: 'PestControl Ltda', status: 'Ativo', alert: 'ok' },
  { name: 'Estação Porta-Isca Externa', cod: 'EST-0025', cat: 'Equipamento', un: 'un', stock: 18, min: 30, max: 150, forn: 'AgroDefensivos', status: 'Ativo', alert: 'low' },
  { name: 'Cupinicida Injeção Solo 20L', cod: 'CUP-2000', cat: 'Inseticida', un: 'L', stock: 22, min: 8, max: 40, forn: 'Química Brasil', status: 'Ativo', alert: 'ok' },
  { name: 'Bactericida Hospitalar 5L', cod: 'BAC-5000', cat: 'Desinfetante', un: 'L', stock: 41, min: 15, max: 60, forn: 'CleanMax', status: 'Ativo', alert: 'ok' },
  { name: 'Fungicida de Ambientes 1L', cod: 'FUN-1000', cat: 'Desinfetante', un: 'L', stock: 3, min: 8, max: 30, forn: 'CleanMax', status: 'Ativo', alert: 'low' },
  { name: 'Gel Anti-Barata Seringa 35g', cod: 'GEL-0035', cat: 'Inseticida', un: 'un', stock: 88, min: 40, max: 200, forn: 'AgroDefensivos', status: 'Ativo', alert: 'ok' },
  { name: 'Máscara Respiratória Semifacial (EPI)', cod: 'EPI-0101', cat: 'EPI', un: 'un', stock: 130, min: 40, max: 250, forn: 'SafeWork EPIs', status: 'Ativo', alert: 'ok' },
  { name: 'Macacão Descartável Tyvek (EPI)', cod: 'EPI-0210', cat: 'EPI', un: 'un', stock: 24, min: 50, max: 300, forn: 'SafeWork EPIs', status: 'Ativo', alert: 'low' },
  { name: 'Luva Nitrílica Química (par)', cod: 'EPI-0330', cat: 'EPI', un: 'par', stock: 260, min: 80, max: 400, forn: 'SafeWork EPIs', status: 'Ativo', alert: 'ok' },
  { name: 'Termonebulizador Portátil (equip.)', cod: 'EQP-0450', cat: 'Equipamento', un: 'un', stock: 6, min: 4, max: 12, forn: '—', status: 'Ativo', alert: 'ok', noForn: true },
  { name: 'Pulverizador Costal 20L', cod: 'EQP-0500', cat: 'Equipamento', un: 'un', stock: 14, min: 6, max: 25, forn: 'AgroDefensivos', status: 'Inativo', alert: 'ok' },
];

export const LOCATIONS = [
  { key: 'central', label: 'Ecomax Central' },
  { key: 'baseSP', label: 'Base São Paulo' },
  { key: 'baseRJ', label: 'Base Rio de Janeiro' },
  { key: 'consolidado', label: 'Consolidado' },
] as const;
export type LocationKey = (typeof LOCATIONS)[number]['key'];

export interface StockRow {
  prod: string;
  lote: string;
  val: string;
  qtd: number;
  min: number;
  max: number;
  loc: string;
  alert: AlertLevel;
}

export const STOCK: StockRow[] = [
  { prod: 'Inseticida Permetrina 500ml', lote: 'LP-2451', val: '08/2026', qtd: 8, min: 20, max: 120, loc: 'Ecomax Central', alert: 'low' },
  { prod: 'Raticida Brodifacoum Blocos', lote: 'RB-1180', val: '11/2026', qtd: 45, min: 15, max: 80, loc: 'Ecomax Central', alert: 'ok' },
  { prod: 'Larvicida Pyriproxyfen 1L', lote: 'LY-0902', val: '03/2026', qtd: 12, min: 10, max: 60, loc: 'Ecomax Central', alert: 'exp' },
  { prod: 'Cupinicida Fipronil 250ml', lote: 'CF-3320', val: '01/2027', qtd: 140, min: 30, max: 120, loc: 'Ecomax Central', alert: 'high' },
  { prod: 'Gel Formicida Profissional', lote: 'GF-7711', val: '06/2027', qtd: 60, min: 25, max: 100, loc: 'Ecomax Central', alert: 'ok' },
  { prod: 'Inseticida Piretroide Concentrado 1L', lote: 'PC-4102', val: '09/2026', qtd: 34, min: 15, max: 70, loc: 'Ecomax Central', alert: 'ok' },
  { prod: 'Mosquicida Aquoso 5L', lote: 'MA-2088', val: '04/2026', qtd: 7, min: 10, max: 45, loc: 'Ecomax Central', alert: 'low' },
  { prod: 'Isca Granulada Formicida 500g', lote: 'IG-5510', val: '12/2027', qtd: 320, min: 100, max: 600, loc: 'Ecomax Central', alert: 'ok' },
  { prod: 'Raticida Bromadiolona Pellets', lote: 'BP-2290', val: '02/2027', qtd: 96, min: 20, max: 80, loc: 'Ecomax Central', alert: 'high' },
  { prod: 'Fungicida de Ambientes 1L', lote: 'FA-1204', val: '05/2026', qtd: 3, min: 8, max: 30, loc: 'Ecomax Central', alert: 'low' },
];

export const STOCK_BY_LOC: Partial<Record<LocationKey, StockRow[]>> = {
  baseSP: [
    { prod: 'Inseticida Permetrina 500ml', lote: 'LP-2455', val: '09/2026', qtd: 30, min: 10, max: 60, loc: 'Base São Paulo', alert: 'ok' },
    { prod: 'Gel Formicida Profissional', lote: 'GF-7720', val: '06/2027', qtd: 4, min: 8, max: 30, loc: 'Base São Paulo', alert: 'low' },
  ],
  baseRJ: [
    { prod: 'Raticida Brodifacoum Blocos', lote: 'RB-1190', val: '10/2026', qtd: 18, min: 6, max: 40, loc: 'Base Rio de Janeiro', alert: 'ok' },
  ],
};

export interface MovRow {
  dt: string;
  tipo: string;
  prod: string;
  orig: string;
  dest: string;
  user: string;
  tone: BadgeTone;
}

export const MOV_ROWS: MovRow[] = [
  { dt: '23/02 08:14', tipo: 'Saída (consumo OS)', prod: 'Inseticida Permetrina · 2 un', orig: 'Carlos H. Souza', dest: 'OS #4232', user: 'App Operador', tone: 'danger' },
  { dt: '22/02 16:40', tipo: 'Transferência', prod: 'Raticida Brodifacoum · 10 kg', orig: 'Ecomax Central', dest: 'Base SP', user: 'Eliana Martins', tone: 'info' },
  { dt: '22/02 10:05', tipo: 'Entrada (NF 8841)', prod: 'Larvicida Pyriproxyfen · 20 L', orig: 'Química Brasil', dest: 'Ecomax Central', user: 'Patrícia Gomes', tone: 'success' },
  { dt: '21/02 14:22', tipo: 'Ajuste manual', prod: 'Gel Formicida · -3 un', orig: 'Correção de contagem', dest: 'Ecomax Central', user: 'Eliana Martins', tone: 'warn' },
];

export interface CotacaoRow {
  cod: string;
  prod: string;
  qtd: string;
  forns: string;
  date: string;
  status: string;
  tone: BadgeTone;
}

export const COTACAO_ROWS: CotacaoRow[] = [
  { cod: 'COT-0231', prod: 'Inseticida Permetrina 500ml', qtd: '100 mL', forns: '3 fornecedores', date: '20/02/2026', status: 'Respondida', tone: 'info' },
  { cod: 'COT-0229', prod: 'Raticida Brodifacoum', qtd: '50 kg', forns: '2 fornecedores', date: '18/02/2026', status: 'Aguardando respostas', tone: 'softWarn' },
  { cod: 'COT-0224', prod: 'Larvicida Pyriproxyfen', qtd: '40 L', forns: '3 fornecedores', date: '12/02/2026', status: 'Aprovada', tone: 'success' },
];

export const COMPARATIVO = [
  { forn: 'Química Brasil', valor: 'R$ 1.180,00', prazo: '5 dias', cond: '30 dias', best: true },
  { forn: 'AgroDefensivos', valor: 'R$ 1.340,00', prazo: '3 dias', cond: 'À vista', best: false },
  { forn: 'PestControl Ltda', valor: 'R$ 1.420,00', prazo: '7 dias', cond: '28 dias', best: false },
];

export type ReqStatus = 'Aguardando aprovação' | 'Aprovada' | 'Enviada' | 'Recebida' | 'Recusada' | 'Cancelada';

export interface ReqRow {
  cod: string;
  prod: string;
  qtd: string;
  forn: string;
  valor: string;
  solic: string;
  status: ReqStatus;
}

export const REQ_ROWS: ReqRow[] = [
  { cod: 'REQ-0142', prod: 'Inseticida Permetrina 500ml', qtd: '100 mL', forn: 'Química Brasil', valor: 'R$ 1.180,00', solic: 'Patrícia Gomes', status: 'Aguardando aprovação' },
  { cod: 'REQ-0140', prod: 'Raticida Brodifacoum', qtd: '50 kg', forn: 'PestControl Ltda', valor: 'R$ 2.050,00', solic: 'Patrícia Gomes', status: 'Aprovada' },
  { cod: 'REQ-0138', prod: 'Larvicida Pyriproxyfen', qtd: '40 L', forn: 'Química Brasil', valor: 'R$ 980,00', solic: 'Eliana Martins', status: 'Enviada' },
  { cod: 'REQ-0131', prod: 'Desinfetante Quaternário', qtd: '60 L', forn: 'CleanMax', valor: 'R$ 1.560,00', solic: 'Patrícia Gomes', status: 'Recebida' },
];

export const reqStatusTone: Record<ReqStatus, BadgeTone> = {
  'Aguardando aprovação': 'softWarn',
  Aprovada: 'info',
  Enviada: 'info',
  Recebida: 'success',
  Recusada: 'danger',
  Cancelada: 'muted',
};

export interface FornRow {
  razao: string;
  cnpj: string;
  contato: string;
  cat: string;
  compras: string;
  status: 'Ativo' | 'Inativo';
  aval: number;
}

export const FORN_ROWS: FornRow[] = [
  { razao: 'Química Brasil Ltda', cnpj: '12.345.678/0001-90', contato: 'comercial@quimicabrasil.com', cat: 'Químicos', compras: 'R$ 84.200', status: 'Ativo', aval: 4.6 },
  { razao: 'PestControl Ltda', cnpj: '98.765.432/0001-10', contato: 'vendas@pestcontrol.com', cat: 'Químicos', compras: 'R$ 51.700', status: 'Ativo', aval: 4.2 },
  { razao: 'AgroDefensivos S.A.', cnpj: '45.111.222/0001-33', contato: 'contato@agrodef.com', cat: 'Químicos', compras: 'R$ 38.900', status: 'Ativo', aval: 3.9 },
  { razao: 'CleanMax Higienização', cnpj: '77.888.999/0001-44', contato: 'sac@cleanmax.com', cat: 'Desinfetantes', compras: 'R$ 22.300', status: 'Inativo', aval: 3.5 },
];

export interface BaseRow {
  nome: string;
  cidade: string;
  uf: string;
  resp: string;
  prods: number;
  valor: string;
  status: string;
  tone: BadgeTone;
}

export const BASE_ROWS: BaseRow[] = [
  { nome: 'Base São Paulo', cidade: 'São Paulo', uf: 'SP', resp: 'Marina Lopes', prods: 24, valor: 'R$ 18.400', status: 'Ativa', tone: 'success' },
  { nome: 'Base Rio de Janeiro', cidade: 'Rio de Janeiro', uf: 'RJ', resp: 'Rafael Oliveira', prods: 11, valor: 'R$ 7.900', status: 'Abaixo do mínimo', tone: 'danger' },
];

export const INV_OPERADOR_ROWS = [
  { op: 'Carlos Henrique Souza', prod: 'Inseticida Permetrina', lote: 'LP-2451', qtd: '6 mL', val: '08/2026', base: 'Base SP' },
  { op: 'Marina Lopes Ferreira', prod: 'Gel Formicida', lote: 'GF-7720', qtd: '12 un', val: '06/2027', base: 'Base SP' },
  { op: 'Rafael Oliveira Lima', prod: 'Raticida Brodifacoum', lote: 'RB-1190', qtd: '4 kg', val: '10/2026', base: 'Base RJ' },
];

export const INV_BASE_ROWS = [
  { base: 'Base São Paulo', prod: 'Inseticida Permetrina', lote: 'LP-2455', qtd: '30 mL', val: '09/2026' },
  { base: 'Base São Paulo', prod: 'Gel Formicida', lote: 'GF-7720', qtd: '4 un', val: '06/2027' },
  { base: 'Base Rio de Janeiro', prod: 'Raticida Brodifacoum', lote: 'RB-1190', qtd: '18 kg', val: '10/2026' },
];

export function distinctValues(field: keyof Produto, allLabel: string) {
  const vals = [...new Set(PRODUCTS.map((p) => p[field]).filter((v) => v && v !== '—'))];
  return [{ value: 'todos', label: allLabel }, ...vals.map((v) => ({ value: String(v), label: String(v) }))];
}
