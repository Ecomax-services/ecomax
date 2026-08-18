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
};

export type OsStackParamList = {
  OsList: undefined;
  OsDetail: { id: string; codigo: string };
};
