import type { BadgeTone } from '@/components/ui/Badge';

// Mapeamentos de apresentação do módulo Estoque. Os dados vêm de lib/estoque.ts (Supabase).
export type AlertLevel = 'low' | 'high' | 'ok' | 'exp';

export const alertMeta: Record<AlertLevel, { label: string; tone: BadgeTone }> = {
  low: { label: 'Abaixo do mínimo', tone: 'danger' },
  high: { label: 'Acima do máximo', tone: 'warn' },
  exp: { label: 'Lote vencendo', tone: 'exp' },
  ok: { label: 'Normal', tone: 'success' },
};
