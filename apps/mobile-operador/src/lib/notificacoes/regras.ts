/**
 * Regras puras das Notificações: a etiqueta, o "quando" e para onde o "Ver
 * detalhes" leva. Sem rede e sem React, para serem testadas fora do App.
 */

import { hojeEmBrasilia, somarDias } from '@/lib/agenda/regras';

/** Etiquetas do protótipo aprovado, com as cores dele. */
export type Etiqueta = 'OS' | 'Documento' | 'Agenda' | 'Aviso';

export const COR_ETIQUETA: Record<Etiqueta, { bg: string; fg: string }> = {
  OS: { bg: '#e7f6e7', fg: '#1d6b25' },
  Documento: { bg: '#eeeff1', fg: '#3a3e45' },
  Agenda: { bg: '#f2f3f4', fg: '#515761' },
  // [A DEFINIR — o protótipo só tem OS, Documento e Agenda. Notificação sem
  // OS e de outro tipo cai aqui, no tom neutro da Agenda.]
  Aviso: { bg: '#f2f3f4', fg: '#515761' },
};

/**
 * Etiqueta pelo `tipo` gravado no banco. Hoje os gatilhos do técnico gravam
 * `os` (OS atribuída) e `info` (saiu de uma OS); `info` com OS é assunto de
 * OS. `documento` e `agenda` já têm etiqueta para quando ganharem produtor.
 */
export function etiquetaDe(n: { tipo: string; osId: string | null }): Etiqueta {
  if (n.tipo === 'documento') return 'Documento';
  if (n.tipo === 'agenda') return 'Agenda';
  if (n.tipo === 'os' || n.osId) return 'OS';
  return 'Aviso';
}

/** Para onde leva o "Ver detalhes". `null` = sem destino, o link não aparece. */
export type DestinoNotificacao = { tipo: 'os'; osId: string } | { tipo: 'agenda' } | { tipo: 'perfil' } | null;

export function destinoDe(n: { tipo: string; osId: string | null }): DestinoNotificacao {
  if (n.osId) return { tipo: 'os', osId: n.osId };
  if (n.tipo === 'agenda') return { tipo: 'agenda' };
  // Documento do técnico (ASO, CNH) fica no Meu Perfil, como no protótipo.
  if (n.tipo === 'documento') return { tipo: 'perfil' };
  return null;
}

const partes = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return { dia: p.day, mes: p.month, hora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
};

/** "Hoje · 10:23", "Ontem · 16:44", "03/02 · 11:20" — no horário de Brasília. */
export function quando(iso: string, agora: Date = new Date()): string {
  const hoje = hojeEmBrasilia(agora);
  const dia = hojeEmBrasilia(new Date(iso));
  const { dia: d, mes: m, hora } = partes(iso);
  if (dia === hoje) return `Hoje · ${hora}`;
  if (dia === somarDias(hoje, -1)) return `Ontem · ${hora}`;
  return `${d}/${m} · ${hora}`;
}
