import { useCallback, useEffect, useState } from 'react';
import { Star, Trash2, Plus, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import {
  listFiltros, salvarFiltro, alternarFavorito, excluirFiltro, OPERADORES,
  type FiltroSalvo, type RegraFiltro,
} from '@/lib/comercial';

/** Colunas oferecidas ao builder, por módulo. */
const CAMPOS: Record<string, { valor: string; label: string }[]> = {
  comercial: [
    { valor: 'cliente', label: 'Cliente' },
    { valor: 'orcamento', label: 'Orçamento' },
    { valor: 'status', label: 'Status' },
    { valor: 'descricao', label: 'Descrição' },
    { valor: 'responsavel', label: 'Responsável' },
    { valor: 'dataAcao', label: 'Data de ação' },
  ],
};

/** Tela 5.1.3 - Filtros salvos, com o builder de regras. */
export function FiltrosSalvosDrawer({ modulo, onClose }: { modulo: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<FiltroSalvo[]>([]);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [visibilidade, setVisibilidade] = useState<'pessoal' | 'global'>('pessoal');
  const [regras, setRegras] = useState<RegraFiltro[]>([]);

  const campos = CAMPOS[modulo] ?? CAMPOS.comercial;

  const load = useCallback(() => {
    listFiltros(modulo).then(setRows).catch((e) => showToast((e as Error).message));
  }, [modulo, showToast]);
  useEffect(() => { load(); }, [load]);

  const addRegra = () =>
    setRegras((r) => [...r, { campo: campos[0].valor, operador: 'contém', valor: '', juncao: 'E' }]);

  const upRegra = (i: number, patch: Partial<RegraFiltro>) =>
    setRegras((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const salvar = async () => {
    try {
      await salvarFiltro(modulo, { nome, categoria, visibilidade, regras });
      setCriando(false); setNome(''); setCategoria(''); setRegras([]);
      showToast('Filtro salvo'); load();
    } catch (e) { showToast((e as Error).message); }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Filtros salvos"
      subtitle="Combinações de regras que você usa com frequência"
      width={560}
      footer={
        criando ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCriando(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar filtro</Button>
          </div>
        ) : (
          <Button onClick={() => { setCriando(true); if (!regras.length) addRegra(); }}>
            <Plus className="h-4 w-4" />Novo filtro
          </Button>
        )
      }
    >
      {!criando ? (
        <div className="flex flex-col gap-2">
          {rows.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-400">
              Nenhum filtro salvo ainda.
            </p>
          )}
          {rows.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3">
              <button
                onClick={() => alternarFavorito(f.id, !f.favorito).then(load).catch((e) => showToast((e as Error).message))}
                aria-label={f.favorito ? `Desfavoritar ${f.nome}` : `Favoritar ${f.nome}`}
                className={cn('shrink-0', f.favorito ? 'text-tag-warnFg' : 'text-ink-300 hover:text-ink-500')}
              >
                <Star className="h-[18px] w-[18px]" fill={f.favorito ? 'currentColor' : 'none'} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{f.nome}</p>
                <p className="text-[13px] text-ink-500">
                  {f.categoria} · {f.visibilidade === 'global' ? 'Global' : 'Pessoal'} · {f.regras.length} regra(s)
                </p>
              </div>
              {/* Filtro global é visível a todos, mas só quem criou apaga. */}
              {f.meu && (
                <button
                  onClick={() => excluirFiltro(f.id).then(load).catch((e) => showToast((e as Error).message))}
                  aria-label={`Excluir ${f.nome}`}
                  className="shrink-0 text-ink-400 hover:text-danger-bright"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <TextField label="Nome do filtro" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Em atraso do meu carteira" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Cobrança" />
            <SelectField
              label="Escopo" value={visibilidade}
              onChange={(e) => setVisibilidade(e.target.value as 'pessoal' | 'global')}
              options={[{ value: 'pessoal', label: 'Pessoal — só eu' }, { value: 'global', label: 'Global — toda a equipe' }]}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-800">Regras</p>
            <div className="flex flex-col gap-2">
              {regras.map((r, i) => (
                <div key={i} className="rounded-xl border border-ink-100 p-3">
                  {i > 0 && (
                    <div className="mb-2 flex gap-1">
                      {(['E', 'OU'] as const).map((j) => (
                        <button
                          key={j}
                          onClick={() => upRegra(i, { juncao: j })}
                          className={cn(
                            'rounded-md px-2.5 py-1 text-xs font-semibold',
                            r.juncao === j ? 'bg-forest-100 text-forest-700' : 'bg-ink-50 text-ink-500',
                          )}
                        >
                          {j}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                    <SelectField
                      value={r.campo} onChange={(e) => upRegra(i, { campo: e.target.value })}
                      options={campos.map((c) => ({ value: c.valor, label: c.label }))}
                    />
                    <SelectField
                      value={r.operador} onChange={(e) => upRegra(i, { operador: e.target.value })}
                      options={OPERADORES.map((o) => ({ value: o, label: o }))}
                    />
                    <button
                      onClick={() => setRegras((rr) => rr.filter((_, j) => j !== i))}
                      aria-label="Remover regra"
                      className="mb-1 text-ink-400 hover:text-danger-bright"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Operadores de presença não pedem valor — mostrar o campo
                      sugeriria que ele conta para alguma coisa. */}
                  {r.operador !== 'vazio' && r.operador !== 'não vazio' && (
                    <TextField
                      className="mt-2" value={r.valor}
                      onChange={(e) => upRegra(i, { valor: e.target.value })}
                      placeholder="Valor"
                    />
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-2" onClick={addRegra}>
              <Plus className="h-4 w-4" />Adicionar regra
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
