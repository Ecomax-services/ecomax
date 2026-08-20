import { useEffect, useState } from 'react';
import { listCatalogoAtivos } from '@/lib/configuracoes';

/**
 * Os status que a tela oferece, vindos do catálogo de Configurações.
 *
 * Sem isto, o Comercial oferecia uma lista embutida no código enquanto
 * Configurações apresentava o catálogo `status_garantia` como se fosse a fonte
 * da verdade: renomear, recolorir ou acrescentar um estágio lá não mudava nada
 * aqui. Eram duas listas para a mesma pergunta, e a que o admin conseguia
 * editar era a que não valia.
 *
 * O `fallback` continua sendo o que a tela mostra enquanto o catálogo carrega —
 * e se ele vier vazio (rede caída, permissão negada), porque um seletor de
 * status sem nenhuma opção trava o trabalho.
 */
export function useCatalogo(catalogo: string, fallback: readonly string[]): string[] {
  const [itens, setItens] = useState<string[]>([...fallback]);
  useEffect(() => {
    let vivo = true;
    listCatalogoAtivos(catalogo)
      .then((v) => { if (vivo && v.length) setItens(v); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [catalogo]);
  return itens;
}
