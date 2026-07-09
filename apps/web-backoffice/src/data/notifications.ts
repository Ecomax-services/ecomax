export type NotificationKind = 'os' | 'info' | 'expired' | 'estoque';

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

/** Estilos de tag por tipo (extraídos do Figma node 5:324). */
export const tagStyles: Record<NotificationKind, string> = {
  os: 'bg-forest-100 text-forest-900',
  info: 'bg-infoTag-bg text-infoTag-fg',
  expired: 'bg-expiredTag-bg text-expiredTag-fg',
  estoque: 'bg-warnTag-bg text-warnTag-fg',
};

export const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'os',
    tagLabel: 'OS',
    datetime: '05/02 · 10:23',
    title: 'Nova ordem de serviço cadastrada',
    description:
      'Uma nova ordem de serviço foi cadastrada no sistema para o cliente Construtora Beta Ltda.',
    actionLabel: 'Ir para ordem de serviço',
    read: false,
  },
  {
    id: 'n2',
    kind: 'info',
    tagLabel: 'Documentos',
    datetime: '05/02 · 10:23',
    title: 'Documentos próximos da validade',
    description:
      'Existem colaboradores com documentos próximos da validade. Verifique e atualize antes do vencimento.',
    actionLabel: 'Ver detalhes',
    read: false,
  },
  {
    id: 'n3',
    kind: 'expired',
    tagLabel: 'Documentos',
    datetime: '04/02 · 16:45',
    title: 'Documentos expirados',
    description: 'Existem colaboradores com documentos expirados. Ação imediata necessária.',
    actionLabel: 'Ver detalhes',
    read: true,
  },
  {
    id: 'n4',
    kind: 'estoque',
    tagLabel: 'Estoque',
    datetime: '03/02 · 09:12',
    title: 'Estoque abaixo do mínimo',
    description: "O produto 'Inseticida Permetrina 500ml' está abaixo do estoque mínimo configurado.",
    actionLabel: 'Ver estoque',
    read: true,
  },
];
