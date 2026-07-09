export type NotificationKind = 'os' | 'info';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  tagLabel: string;
  datetime: string;
  title: string;
  description: string;
  actionLabel: string;
  read: boolean;
}

/** Estilos de tag por tipo (Figma node 31:788). */
export const tagStyles: Record<NotificationKind, string> = {
  os: 'bg-forest-100 text-forest-900',
  info: 'bg-infoTag-bg text-infoTag-fg',
};

/** Notificações do Portal do Cliente (node 31:788). */
export const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'os',
    tagLabel: 'OS',
    datetime: '05/02 · 10:23',
    title: 'Nova OS no sistema',
    description: 'Sua nova OS #4232 foi cadastrada no sistema. Acompanhe o status pelo portal.',
    actionLabel: 'Ir para ordem de serviço',
    read: false,
  },
  {
    id: 'n2',
    kind: 'info',
    tagLabel: 'Relatório',
    datetime: '05/02 · 10:23',
    title: 'Relatório técnico disponível',
    description: 'O relatório da OS #4180 foi emitido. Acesse a seção Documentos para visualizar.',
    actionLabel: 'Ver detalhes',
    read: false,
  },
];
