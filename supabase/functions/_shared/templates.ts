/**
 * Os e-mails que o sistema manda.
 *
 * Ficam aqui, e não espalhados pelas funções, porque são a voz da Ecomax para
 * quem está fora dela: o cliente que recebe um aviso e o operador que precisa
 * entrar no aplicativo pela primeira vez. Um layout só, texto curto, e o botão
 * repetido como endereço em texto — cliente de e-mail corporativo costuma
 * bloquear o link do botão.
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
/** Nome de pessoa e código de OS entram no HTML; escapar não é opcional. */
export const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ESCAPE[c]);

function layout(titulo: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title></head>
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c2024">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="padding:24px 28px 8px">
      <div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#1a7a3c;text-transform:uppercase">Ecomax</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">Controle de pragas</div>
    </td></tr>
    <tr><td style="padding:8px 28px 28px">${corpo}</td></tr>
    <tr><td style="padding:16px 28px;background:#f9fafb;font-size:12px;color:#6b7280;line-height:1.5">
      Você recebeu este e-mail porque tem cadastro no sistema da Ecomax.
      Se não reconhece esta mensagem, ignore — nada acontece sem você clicar.
    </td></tr>
  </table>
</body></html>`;
}

const botao = (url: string, rotulo: string) => `
  <p style="margin:24px 0">
    <a href="${esc(url)}" style="display:inline-block;background:#1a7a3c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">${esc(rotulo)}</a>
  </p>
  <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Se o botão não abrir, copie este endereço:</p>
  <p style="margin:0;font-size:12px;color:#3056b5;word-break:break-all">${esc(url)}</p>`;

/** Redefinição pedida pela própria pessoa. */
export function emailRecuperacao(url: string, horas: number) {
  const html = layout('Redefinir sua senha', `
    <h1 style="font-size:20px;margin:16px 0 8px">Redefinir sua senha</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#374151">
      Alguém — provavelmente você — pediu para redefinir a senha de acesso. Use o
      botão abaixo para criar uma nova. O link vale por ${horas} hora${horas > 1 ? 's' : ''}.
    </p>
    ${botao(url, 'Criar nova senha')}
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280">
      Se não foi você, não precisa fazer nada: sua senha continua a mesma.
    </p>`);
  return {
    assunto: 'Redefinir sua senha · Ecomax',
    html,
    texto: `Redefinir sua senha\n\nUse este endereço para criar uma nova senha (vale por ${horas}h):\n${url}\n\nSe não foi você, ignore este e-mail.`,
  };
}

/**
 * Primeiro acesso: a conta acabou de ser criada por um administrador.
 *
 * `appMobile` muda o fecho da mensagem, e não por capricho: o link abre um
 * aplicativo instalado, e quem ainda está usando o Expo Go não tem esse
 * aplicativo — o link não abre nada. Dizer isso no e-mail, junto com a saída
 * (a senha provisória que o administrador entregou), evita a pessoa concluir
 * que o cadastro dela não funcionou.
 */
export function emailPrimeiroAcesso(url: string, nome: string, ondeEntrar: string, appMobile = false) {
  const fecho = appMobile
    ? `<p style="margin:24px 0 0;font-size:13px;color:#6b7280">
         Se o botão não abrir o aplicativo, entre com a <strong>senha provisória</strong>
         que a Ecomax passou para você e troque a senha depois, em Configurações →
         Alterar senha.
       </p>`
    : `<p style="margin:24px 0 0;font-size:13px;color:#6b7280">
         Se precisar de ajuda, fale com quem cadastrou você.
       </p>`;

  const html = layout('Seu acesso à Ecomax', `
    <h1 style="font-size:20px;margin:16px 0 8px">Olá, ${esc(nome)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#374151">
      Sua conta no ${esc(ondeEntrar)} da Ecomax foi criada. Para começar, defina
      a sua senha — é o único passo que falta.
    </p>
    ${botao(url, 'Definir minha senha')}
    ${fecho}`);

  const extra = appMobile
    ? '\n\nSe o link não abrir o aplicativo, entre com a senha provisória que a Ecomax passou para você.'
    : '';
  return {
    assunto: `Seu acesso ao ${ondeEntrar} · Ecomax`,
    html,
    texto: `Olá, ${nome}\n\nSua conta no ${ondeEntrar} da Ecomax foi criada. Defina sua senha:\n${url}${extra}`,
  };
}
