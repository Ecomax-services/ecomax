import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  EmailSent: undefined;
  Main: undefined;
};

export type ConfigStackParamList = {
  Configuracoes: undefined;
  Perfil: undefined;
  Preferencias: undefined;
  Sobre: undefined;
};

export type OsStackParamList = {
  OsList: undefined;
  OsDetail: { id: string; codigo: string };
};

/** As abas. Tipar isto é o que permite navegar de uma aba para uma tela de
 *  outra (Notificações → detalhe da OS) sem `as never` escondendo erro. */
export type MainTabParamList = {
  OS: NavigatorScreenParams<OsStackParamList>;
  Agenda: undefined;
  Notificacoes: undefined;
  Config: NavigatorScreenParams<ConfigStackParamList>;
};
