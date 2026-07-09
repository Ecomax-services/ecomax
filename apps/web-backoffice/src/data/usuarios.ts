import type { BadgeTone } from '@/components/ui/Badge';

export type DocState = 'ok' | 'soon' | 'expired' | 'na';

/** Shape do funcionário consumido pela UI (produzido por lib/funcionarios.toUsuario). */
export interface Usuario {
  id: string;
  name: string;
  initials: string;
  cpf: string;
  cargo: string;
  setor: string;
  gestor: string;
  status: 'Ativo' | 'Inativo';
  aso: string;
  asoState: DocState;
  cnh: string;
  cnhState: DocState;
  last: string;
  access: boolean;
}

export const docTone: Record<DocState, BadgeTone> = {
  ok: 'success',
  soon: 'warn',
  expired: 'danger',
  na: 'muted',
};

// Copy dos modais de ação (apresentação; a persistência é feita via lib/funcionarios + Edge Function).
export type UserActionKey = 'reset' | 'bloquear' | 'perfil' | 'inativar' | 'hist';

export interface ActionInfo {
  title: string;
  desc: string;
  confirm: string;
  danger?: boolean;
  justify?: boolean;
  isPerfil?: boolean;
  isHist?: boolean;
}

export const actionInfoMap: Record<UserActionKey, ActionInfo> = {
  reset: { title: 'Resetar senha', desc: 'Um e-mail de redefinição de senha será enviado ao funcionário. A ação é registrada na auditoria.', confirm: 'Resetar senha' },
  bloquear: { title: 'Bloquear acesso', desc: 'O funcionário não conseguirá acessar a plataforma até o desbloqueio. Sessões ativas serão encerradas.', confirm: 'Bloquear acesso', danger: true, justify: true },
  perfil: { title: 'Alterar perfil de acesso', desc: 'A mudança redefine as permissões por módulo e é auditada.', confirm: 'Alterar perfil', isPerfil: true },
  inativar: { title: 'Inativar funcionário', desc: 'O registro fica inativo e o login é encerrado. Pode ser reativado depois.', confirm: 'Inativar', danger: true, justify: true },
  hist: { title: 'Histórico de alterações', desc: '', confirm: '', isHist: true },
};
