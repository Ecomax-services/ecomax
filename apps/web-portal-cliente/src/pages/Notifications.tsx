import { useMemo, useState } from 'react';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import {
  initialNotifications,
  tagStyles,
  type NotificationItem,
} from '@/data/notifications';

type Tab = 'todas' | 'nao-lidas' | 'lidas';

const tabs: { key: Tab; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'nao-lidas', label: 'Não lidas' },
  { key: 'lidas', label: 'Lidas' },
];

/** Tela 2 - Notificações (nodes 5:324 e 83:387). */
export function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [tab, setTab] = useState<Tab>('todas');

  const unreadCount = items.filter((n) => !n.read).length;

  const visible = useMemo(() => {
    if (tab === 'nao-lidas') return items.filter((n) => !n.read);
    if (tab === 'lidas') return items.filter((n) => n.read);
    return items;
  }, [items, tab]);

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const remove = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));

  return (
    <>
      <Topbar
        title="Notificações"
        breadcrumb="Início  /  Notificações"
        action={
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="rounded-lg bg-forest-100 px-3 py-2 text-xs font-medium text-forest-500 transition hover:bg-forest-100/70 disabled:opacity-50"
          >
            Marcar todas como lidas
          </button>
        }
      />

      <div className="flex-1 px-8 py-6">
        {/* Cabeçalho: contador + filtros */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[22px] min-w-7 items-center justify-center rounded-full bg-danger-bright px-2 text-[13px] font-semibold text-white">
              {unreadCount}
            </span>
            <span className="text-sm text-ink-500">notificações não lidas</span>
          </div>

          <div className="flex rounded-lg border border-ink-200 bg-white p-px">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'h-8 w-[92px] rounded-md text-[13px] transition-colors',
                  tab === t.key
                    ? 'bg-forest-100 font-medium text-forest-500'
                    : 'text-ink-500 hover:text-ink-900',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {visible.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <ul className="space-y-4">
            {visible.map((n) => (
              <NotificationCard
                key={n.id}
                item={n}
                onAction={() => markRead(n.id)}
                onDelete={() => remove(n.id)}
              />
            ))}
          </ul>
        )}

        {visible.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button className="h-10 w-40 rounded-lg border border-ink-200 bg-white text-[13px] font-medium text-ink-500 hover:bg-ink-50">
              Carregar mais
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function NotificationCard({
  item,
  onAction,
  onDelete,
}: {
  item: NotificationItem;
  onAction: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        'relative rounded-xl px-10 py-4',
        item.read ? 'border border-ink-200 bg-white' : 'bg-forest-50',
      )}
    >
      {!item.read && (
        <span className="absolute left-5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-forest-500" />
      )}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'rounded px-2.5 py-1 text-[11px] font-medium',
            tagStyles[item.kind],
          )}
        >
          {item.tagLabel}
        </span>
        <span className="text-xs text-ink-500">{item.datetime}</span>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold text-ink-900">{item.title}</h3>
      <p className="mt-1 text-[13px] text-ink-500">{item.description}</p>
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={onAction}
          className="text-xs font-medium text-forest-600 hover:underline"
        >
          {item.actionLabel}
        </button>
        <button onClick={onDelete} className="text-xs text-danger hover:underline">
          Excluir
        </button>
      </div>
    </li>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const text =
    tab === 'nao-lidas'
      ? 'Nenhuma notificação não lida.'
      : tab === 'lidas'
        ? 'Nenhuma notificação lida.'
        : 'Você não tem notificações.';
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white text-sm text-ink-500">
      {text}
    </div>
  );
}
