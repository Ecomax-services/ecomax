/**
 * Lê o erro que o Supabase devolve no endereço da página de recuperação.
 *
 * Quando o link do e-mail não vale mais, o Supabase não manda o usuário para
 * uma tela de erro: ele redireciona para a mesma página, com o motivo no
 * fragmento da URL —
 *
 *   /criar-senha#error=access_denied&error_code=otp_expired&error_description=...
 *
 * A tela ignorava isso e mostrava o formulário normalmente. O usuário digitava
 * a senha, via "Força da senha: Forte", clicava em salvar e não acontecia nada
 * — porque o botão estava desabilitado por não haver sessão. A explicação
 * estava na barra de endereço o tempo todo.
 *
 * O erro vem no fragmento (`#`), e não na query (`?`), justamente para não ser
 * enviado ao servidor nem parar em log de acesso. Por isso só o JavaScript
 * consegue lê-lo.
 */
export interface ErroDoLink {
  codigo: string;
  titulo: string;
  mensagem: string;
  /** Verdadeiro quando pedir um link novo resolve. */
  pedirOutro: boolean;
}

const MENSAGENS: Record<string, Omit<ErroDoLink, 'codigo'>> = {
  otp_expired: {
    titulo: 'Este link expirou',
    mensagem: 'Links de definição de senha valem por tempo limitado. Peça um novo e use-o assim que chegar.',
    pedirOutro: true,
  },
  access_denied: {
    titulo: 'Este link não é mais válido',
    mensagem: 'Ele pode já ter sido usado ou substituído por um mais recente. Peça um novo para continuar.',
    pedirOutro: true,
  },
  server_error: {
    titulo: 'Não foi possível validar o link',
    mensagem: 'Houve uma falha ao confirmar o link. Tente novamente em alguns instantes.',
    pedirOutro: true,
  },
};

/**
 * Devolve o erro presente na URL, ou null quando não há nenhum.
 *
 * Limpa o fragmento depois de ler: sem isso, um F5 mostraria o mesmo erro
 * mesmo depois de o usuário pedir outro link, e o endereço com o erro ficaria
 * sendo copiado e colado por aí.
 */
export function lerErroDoLink(limpar = true): ErroDoLink | null {
  const bruto = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!bruto) return null;

  const p = new URLSearchParams(bruto);
  const codigo = p.get('error_code') ?? p.get('error');
  if (!codigo) return null;

  if (limpar) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const conhecido = MENSAGENS[codigo];
  if (conhecido) return { codigo, ...conhecido };

  // Código que não mapeamos: mostra o que o Supabase disse, em vez de engolir.
  // Um erro sem tratamento específico ainda é melhor exibido do que escondido.
  const descricao = p.get('error_description');
  return {
    codigo,
    titulo: 'Não foi possível abrir esta página',
    mensagem: descricao ? descricao.replace(/\+/g, ' ') : 'O link de acesso não pôde ser validado.',
    pedirOutro: true,
  };
}
