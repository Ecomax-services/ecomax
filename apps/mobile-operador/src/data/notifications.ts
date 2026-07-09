import { colors } from '@/theme';

export type NotificationKind = 'os' | 'info' | 'warn';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  tagLabel: string;
  datetime: string;
  title: string;
  description: string;
  read: boolean;
}

export const tagColors: Record<NotificationKind, { bg: string; fg: string }> = {
  os: { bg: colors.primarySoft, fg: colors.primary },
  info: { bg: colors.infoBg, fg: colors.infoFg },
  warn: { bg: colors.warnBg, fg: colors.warnFg },
};

/** Notificações do App Operador (Figma node 30:497). */
export const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'os',
    tagLabel: 'OS',
    datetime: 'Hoje · 10:23',
    title: 'Nova OS emitida para você',
    description: 'Uma ordem de serviço foi gerada para o cliente Construtora Beta.',
    read: false,
  },
  {
    id: 'n2',
    kind: 'info',
    tagLabel: 'Documento',
    datetime: 'Hoje · 09:15',
    title: 'Documentos próximos da validade',
    description: 'Seu CNH vence em 15 dias. Atualize antes do prazo.',
    read: false,
  },
  {
    id: 'n3',
    kind: 'os',
    tagLabel: 'OS',
    datetime: 'Ontem · 16:44',
    title: 'OS #4231 concluída com sucesso',
    description: 'Atendimento finalizado. Aguardando avaliação do cliente.',
    read: true,
  },
  {
    id: 'n4',
    kind: 'warn',
    tagLabel: 'Documento',
    datetime: '03/02 · 11:20',
    title: 'Documento expirado',
    description: 'Seu ASO está expirado. Regularize com urgência.',
    read: true,
  },
];
