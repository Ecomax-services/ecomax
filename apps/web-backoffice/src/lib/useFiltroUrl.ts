import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Um filtro de lista que mora na barra de endereço, e não só na memória da tela.
 *
 * Com `useState`, filtrar → abrir um item → voltar devolve a lista inteira: o
 * componente remonta e o filtro morre junto. Em Operacional isso significa
 * refazer a seleção a cada linha conferida, e é o que mais consome tempo de
 * quem trabalha na lista.
 *
 * Na URL, três coisas passam a funcionar de graça: o botão voltar do navegador
 * restaura exatamente o que estava filtrado, o F5 não perde nada, e a lista
 * filtrada vira um endereço que dá para mandar para outra pessoa.
 *
 * A troca no chamador é só o nome — a assinatura é a mesma de `useState`.
 *
 * `replace: true` de propósito: sem ele cada tecla digitada na busca vira uma
 * entrada de histórico, e voltar passaria a desfazer letra por letra em vez de
 * sair da tela.
 */
export function useFiltroUrl(
  chave: string,
  inicial: string,
  /**
   * Valores aceitos, quando existe um conjunto fechado. Sem isto, um endereço
   * com `?status=ativo` — digitado à mão, ou vindo de um link antigo — fazia o
   * seletor exibir "Todos os status" enquanto a lista filtrava por "ativo": a
   * tela mostrando um estado e aplicando outro, e o resultado vazio sem
   * explicação.
   *
   * Lista vazia significa "ainda não carregou" (categorias e fornecedores vêm
   * do banco): nesse momento nada é descartado, senão o filtro se perderia
   * entre a montagem da tela e a chegada das opções.
   */
  validos?: readonly string[],
): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const bruto = params.get(chave) ?? inicial;
  const valor = !validos?.length || validos.includes(bruto) ? bruto : inicial;

  const definir = useCallback((v: string) => {
    setParams((atual) => {
      const proximo = new URLSearchParams(atual);
      // O valor padrão sai da URL em vez de virar `?status=todos`: endereço
      // limpo quando não há filtro nenhum.
      if (v === inicial || v === '') proximo.delete(chave);
      else proximo.set(chave, v);
      return proximo;
    }, { replace: true });
  }, [chave, inicial, setParams]);

  return [valor, definir];
}

/** A mesma ideia para a paginação, que é número. */
export function usePaginaUrl(chave = 'p'): [number, (n: number) => void] {
  const [bruto, definirBruto] = useFiltroUrl(chave, '1');
  const pagina = Math.max(1, Number(bruto) || 1);
  const definir = useCallback((n: number) => definirBruto(String(Math.max(1, n))), [definirBruto]);
  return [pagina, definir];
}
