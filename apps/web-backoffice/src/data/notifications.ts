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
