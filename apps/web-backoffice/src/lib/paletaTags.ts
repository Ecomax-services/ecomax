/**
 * Cores das etiquetas dos catálogos.
 *
 * Saiu de dentro de CadastrosAuxiliares.tsx quando a planilha por tipo de
 * serviço passou a usar a mesma paleta: duas telas escolhendo cor de etiqueta a
 * partir de listas separadas divergiriam na primeira vez que alguém ajustasse
 * um tom.
 */
export interface CorTag { bg: string; fg: string; nome: string }

export const PALETA_TAGS: CorTag[] = [
  { bg: '#d3f7d3', fg: '#155015', nome: 'Verde' },
  { bg: '#a3eba3', fg: '#0f3f0f', nome: 'Verde escuro' },
  { bg: '#e8eefc', fg: '#3056b5', nome: 'Azul' },
  { bg: '#fdebd0', fg: '#b45309', nome: 'Âmbar' },
  { bg: '#ffddd5', fg: '#a81400', nome: 'Vermelho' },
  { bg: '#ede9fe', fg: '#6d28d9', nome: 'Roxo' },
  { bg: '#f2f3f4', fg: '#686f7d', nome: 'Cinza' },
];
