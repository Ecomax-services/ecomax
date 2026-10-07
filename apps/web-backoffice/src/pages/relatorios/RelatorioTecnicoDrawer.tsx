import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Cloud, CloudOff, EyeOff, History, Lock, Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { rotuloStatus } from '@/lib/statusOs';
import {
  contagemDeBlocos, ddmm, montarBlocos, rotuloDoPeriodo,
  type Bloco, type ConteudoVersao, type Frequencia, type GrupoDeBlocos,
} from '@/lib/relatorio';
import { abrirRelatorio, lancarCaptura, salvarVersao, type RelatorioAberto } from '@/lib/relatoriosTecnicos';

type Aba = 'blocos' | 'exec' | 'compl';
type Selecao = 'capa' | 'descritivo' | string;

const br = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const dataHora = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};
const formatCnpj = (c: string | null) => {
  const d = (c ?? '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c ?? '';
};

const FREQS: { key: Frequencia; label: string }[] = [
  { key: 'semanal', label: 'Semanal' }, { key: 'quinzenal', label: 'Quinzenal' }, { key: 'mensal', label: 'Mensal' },
];

/**
 * Editor do relatório técnico — painel lateral do protótipo aprovado.
 *
 * Abas deste PR: Blocos do relatório, Dados da execução e Campos
 * complementares (onde se salva). Pré-visualização, Versões e as ações do
 * rodapé (imprimir, baixar, enviar, publicar) entram no PR 24.
 *
 * Tudo o que se edita aqui — textos, incluir/ocultar, frequência — fica num
 * rascunho local até "Salvar e gerar nova versão". A Captura Não-Alvo é dado
 * da visita, não da versão: grava na hora.
 */
export function RelatorioTecnicoDrawer({ osId, onClose, onSalvo }: { osId: string; onClose: () => void; onSalvo: () => void }) {
  const { showToast } = useToast();
  const { can, profile } = useAuth();
  const podeEditar = can('relatorios', 'editar');

  const [rel, setRel] = useState<RelatorioAberto | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<ConteudoVersao>({});
  const [notas, setNotas] = useState('');
  const [aba, setAba] = useState<Aba>('blocos');
  const [sel, setSel] = useState<Selecao>('capa');
  const [erros, setErros] = useState<{ observacoes?: string; parecer?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmarFechar, setConfirmarFechar] = useState(false);

  const carregar = useCallback(() => {
    abrirRelatorio(osId)
      .then((r) => { setRel(r); setRascunho(r.conteudo); setNotas(r.notasInternas); })
      .catch((e) => setErroCarga((e as Error).message));
  }, [osId]);
  useEffect(() => { carregar(); }, [carregar]);

  const grupos = useMemo(() => (rel ? montarBlocos(rel.dados, rascunho) : []), [rel, rascunho]);
  const sujo = !!rel && (JSON.stringify(rascunho) !== JSON.stringify(rel.conteudo) || notas !== rel.notasInternas);
  const contagem = contagemDeBlocos(grupos);

  const fechar = () => (sujo ? setConfirmarFechar(true) : onClose());

  const editar = (patch: Partial<ConteudoVersao>) => setRascunho((r) => ({ ...r, ...patch }));
  const editarMapa = (campo: 'blocos' | 'visibilidade' | 'frequencias', id: string, valor: unknown) =>
    setRascunho((r) => ({ ...r, [campo]: { ...(r[campo] ?? {}), [id]: valor } }));

  const salvar = async () => {
    if (!rel) return;
    const e: typeof erros = {};
    if (!rascunho.observacoes?.trim()) e.observacoes = 'As observações técnicas são obrigatórias no relatório.';
    if (!rascunho.parecer?.trim()) e.parecer = 'Informe o parecer técnico antes de gerar a nova versão.';
    setErros(e);
    if (Object.keys(e).length) { setAba('compl'); showToast('Corrija os campos destacados para gerar a versão'); return; }
    setSalvando(true);
    try {
      const v = await salvarVersao(osId, rascunho, notas, rel.versaoAtual);
      showToast(`${rel.dados.os.codigo} · nova versão v${v} gerada por ${profile?.nome_completo ?? 'você'}`);
      onSalvo();
      carregar();
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const capturar = async (clientePontoId: string, especie: string | null) => {
    try {
      await lancarCaptura(osId, clientePontoId, especie);
      // Recarrega só os dados; o rascunho de textos fica como está.
      const r = await abrirRelatorio(osId);
      setRel((atual) => (atual ? { ...atual, dados: r.dados } : r));
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  if (!rel) {
    return (
      <Drawer open onClose={onClose} title="Relatório técnico" width={1000}>
        <p className="p-8 text-sm text-ink-500">{erroCarga ?? 'Carregando…'}</p>
      </Drawer>
    );
  }

  const { dados } = rel;
  const os = dados.os;
  const todosBlocos = grupos.flatMap((g) => g.blocos);
  const bloco = todosBlocos.find((b) => b.id === sel);
  const publicado = dados.relatorio?.versao_publicada != null;

  return (
    <>
      <Drawer
        open
        onClose={fechar}
        width={1000}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Relatório técnico · {os.codigo}
            {publicado
              ? <Chip cls="bg-[#eaf6ea] text-[#1a5c1a]"><Cloud className="h-3.5 w-3.5" />Publicado no portal · {dataHora(dados.relatorio!.publicado_em!)}</Chip>
              : <Chip cls="bg-[#fdf3e6] text-[#b45309]"><CloudOff className="h-3.5 w-3.5" />Não publicado</Chip>}
            <Chip cls="bg-ink-100 text-ink-500">v{rel.versaoAtual}</Chip>
          </span>
        }
        subtitle={`${os.cliente.nome} · ${os.tipos.join(', ') || '—'} · execução ${br(os.data_execucao)} · ${rotuloStatus(os.status)}`}
        headerExtra={
          <div className="flex gap-1.5 pb-3">
            {([
              ['blocos', `Blocos do relatório (${contagem.incluidos} de ${contagem.total})`],
              ['exec', 'Dados da execução'],
              ['compl', 'Campos complementares'],
            ] as [Aba, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setAba(k)}
                className={cn('rounded-full px-3.5 py-1.5 text-[13px] font-semibold', aba === k ? 'bg-forest-600 text-white' : 'bg-ink-50 text-ink-500 hover:text-ink-900')}>
                {l}
              </button>
            ))}
          </div>
        }
      >
        <div className="px-7 py-5">
          {aba === 'blocos' && (
            <>
              <p className="mb-4 rounded-lg bg-[#eef8ee] px-4 py-2.5 text-[13px] text-[#2e6b31]">
                {grupos.map((g) => g.areaNome).join(' · ') || 'Sem áreas'} · {contagem.incluidos} de {contagem.total} blocos incluídos. Use o interruptor na lista para incluir ou ocultar cada bloco.
              </p>
              <div className="grid grid-cols-[270px_minmax(0,1fr)] gap-5">
                <Indice grupos={grupos} sel={sel} onSel={setSel} podeEditar={podeEditar}
                  onAlternar={(b) => editarMapa('visibilidade', b.id, !b.incluido)} />
                <div className="min-w-0">
                  {sel === 'capa' && <PainelCapa rel={rel} />}
                  {sel === 'descritivo' && (
                    <Painel titulo="Bloco descritivo" sub="Abre o relatório, antes dos blocos por serviço. Preenchido no backoffice.">
                      <CamposTexto rascunho={rascunho} editar={editar} erros={erros} podeEditar={podeEditar} sem="sugestoes" />
                      <Notas notas={notas} setNotas={setNotas} podeEditar={podeEditar} />
                      <p className="text-[13px] text-ink-400">Salvar em Campos complementares gera uma nova versão com estes textos.</p>
                    </Painel>
                  )}
                  {bloco && (
                    <PainelBloco
                      bloco={bloco} podeEditar={podeEditar} osId={os.id}
                      especies={dados.especies_nao_alvo}
                      onIncluir={() => editarMapa('visibilidade', bloco.id, true)}
                      onFrequencia={(f) => editarMapa('frequencias', bloco.id, f)}
                      onTexto={(t) => editarMapa('blocos', bloco.id, t)}
                      onCaptura={capturar}
                    />
                  )}
                </div>
              </div>
            </>
          )}
          {aba === 'exec' && <DadosExecucao rel={rel} grupos={grupos} />}
          {aba === 'compl' && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 rounded-lg bg-[#eef8ee] px-4 py-2.5 text-[13px] text-[#2e6b31]">
                <History className="h-4 w-4" />Toda edição salva gera automaticamente uma nova versão do relatório: as anteriores ficam preservadas no histórico.
              </p>
              <CamposTexto rascunho={rascunho} editar={(p) => { editar(p); setErros((e) => ({ ...e, ...Object.fromEntries(Object.keys(p).map((k) => [k, undefined])) })); }} erros={erros} podeEditar={podeEditar} />
              <Notas notas={notas} setNotas={setNotas} podeEditar={podeEditar} />
              {podeEditar && (
                <div className="flex items-center justify-end gap-3">
                  {sujo && <span className="text-[13px] font-semibold text-[#b45309]">Alterações não salvas nesta versão</span>}
                  <Button onClick={salvar} disabled={salvando}><Save className="h-4 w-4" />Salvar e gerar nova versão</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmarFechar}
        title="Descartar as alterações?"
        description="Há alterações que ainda não viraram versão. Fechar descarta essas alterações."
        confirmLabel="Descartar e fechar"
        destructive
        onConfirm={() => { setConfirmarFechar(false); onClose(); }}
        onClose={() => setConfirmarFechar(false)}
      />
    </>
  );
}

function Chip({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', cls)}>{children}</span>;
}

function Painel({ titulo, sub, children }: { titulo: string; sub?: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-ink-900">{titulo}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-ink-400">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Indice({ grupos, sel, onSel, onAlternar, podeEditar }: {
  grupos: GrupoDeBlocos[]; sel: Selecao; onSel: (s: Selecao) => void; onAlternar: (b: Bloco) => void; podeEditar: boolean;
}) {
  const fixo = (id: Selecao, label: string) => (
    <button onClick={() => onSel(id)} className={itemCls(sel === id, true)}>
      <span className="flex-1 text-left">{label}</span>
      <span title="Sempre incluído"><Lock className="h-3.5 w-3.5 text-ink-400" /></span>
    </button>
  );
  return (
    <nav className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Abertura</p>
        {fixo('capa', 'Capa e dados fixos')}
        {fixo('descritivo', 'Bloco descritivo')}
      </div>
      {grupos.map((g) => (
        <div key={g.areaNome} className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{g.areaNome}</p>
          {g.blocos.map((b) => {
            const sub = b.servico === 'CN' ? 'situação atípica, use apenas quando o cliente exigir'
              : b.servico === 'CMP' ? 'bloco opcional, inclua quando o cliente pedir' : null;
            return (
              <div key={b.id} className={itemCls(sel === b.id, b.incluido)}>
                <button onClick={() => onSel(b.id)} className="min-w-0 flex-1 text-left">
                  <span className="block">{b.rotulo}</span>
                  {(sub || !b.incluido) && (
                    <span className={cn('mt-0.5 block text-[11.5px] font-normal', b.incluido ? 'text-[#b45309]' : 'text-ink-400')}>
                      {b.incluido ? 'Incluído' : 'Oculto'} · {sub ?? 'fora da pré-visualização e do PDF'}
                    </span>
                  )}
                </button>
                <button
                  role="switch" aria-checked={b.incluido} disabled={!podeEditar}
                  title={b.incluido ? 'Ocultar do relatório' : 'Incluir no relatório'}
                  aria-label={b.incluido ? 'Ocultar do relatório' : 'Incluir no relatório'}
                  onClick={() => onAlternar(b)}
                  className={cn('relative h-[18px] w-8 shrink-0 rounded-full transition-colors disabled:opacity-50', b.incluido ? 'bg-forest-600' : 'bg-ink-200')}
                >
                  <span className={cn('absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all', b.incluido ? 'left-[16px]' : 'left-0.5')} />
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const itemCls = (ativo: boolean, incluido: boolean) => cn(
  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px]',
  ativo ? 'border border-forest-600 bg-[#edfced] font-bold text-[#0f3f0f]'
    : incluido ? 'border border-ink-100 bg-white font-medium text-ink-700 hover:bg-ink-50'
      : 'border border-dashed border-ink-200 bg-[#fafbfa] text-ink-400',
);

function Linhas({ linhas }: { linhas: [string, string][] }) {
  return (
    <dl className="divide-y divide-ink-100 rounded-lg border border-ink-100">
      {linhas.map(([r, v]) => (
        <div key={r} className="grid grid-cols-[200px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-[13px]">
          <dt className="text-ink-400">{r}</dt><dd className="text-ink-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function PainelCapa({ rel }: { rel: RelatorioAberto }) {
  const { dados } = rel;
  const e = dados.empresa;
  const rt = dados.responsavel_tecnico;
  const linhas: [string, string][] = [
    ['Empresa executante', [e?.razao_social, e?.cnpj ? `CNPJ ${formatCnpj(e.cnpj)}` : null].filter(Boolean).join(' · ') || 'A cadastrar'],
    ['Endereço da executante', e?.endereco || 'A cadastrar'],
    ...dados.licencas.map((l) => [l.rotulo, l.descricao] as [string, string]),
    ['Responsável técnico', rt ? [rt.nome, rt.conselho && rt.registro ? `${rt.conselho} ${rt.registro}` : null].filter(Boolean).join(' · ') : 'A cadastrar'],
    ['Cliente', dados.os.cliente.nome],
    ['Local', dados.os.endereco_execucao || dados.os.cliente.endereco || 'Endereço do cliente no cadastro'],
    ['Ordem de serviço', `${dados.os.codigo} · execução ${br(dados.os.data_execucao)}`],
    ['Equipe técnica', dados.os.equipe.join(' · ') || dados.os.tecnico_executor || '—'],
  ];
  return (
    <Painel titulo="Capa e dados fixos" sub="Vêm do cadastro da Ecomax e do cliente. Não são editados no relatório.">
      <Linhas linhas={linhas} />
    </Painel>
  );
}

function CamposTexto({ rascunho, editar, erros, podeEditar, sem }: {
  rascunho: ConteudoVersao; editar: (p: Partial<ConteudoVersao>) => void; erros: { observacoes?: string; parecer?: string };
  podeEditar: boolean; sem?: 'sugestoes';
}) {
  const campo = (k: keyof Pick<ConteudoVersao, 'observacoes' | 'recomendacoes' | 'parecer' | 'sugestoes'>, label: string, placeholder: string, req?: boolean) => (
    <div>
      <TextareaField label={label} required={req} placeholder={placeholder} value={rascunho[k] ?? ''} disabled={!podeEditar}
        onChange={(e) => editar({ [k]: e.target.value })} className={cn(erros[k as 'observacoes'] && 'border-[#ffb8a8]')} />
      {erros[k as 'observacoes'] && <p className="mt-1.5 text-[13px] text-danger-bright">{erros[k as 'observacoes']}</p>}
    </div>
  );
  return (
    <div className="space-y-3.5">
      {campo('observacoes', 'Observações técnicas', 'Constatações da execução', true)}
      {campo('recomendacoes', 'Recomendações ao cliente', 'Ações que o cliente deve executar')}
      {campo('parecer', 'Parecer técnico', 'Conclusão técnica sobre o ambiente', true)}
      {sem !== 'sugestoes' && campo('sugestoes', 'Sugestões de melhoria', 'Sugestões internas / ao cliente')}
    </div>
  );
}

function Notas({ notas, setNotas, podeEditar }: { notas: string; setNotas: (v: string) => void; podeEditar: boolean }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50 p-3.5">
      <p className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-ink-700">
        Notas internas (uso interno, não aparecem para o cliente)
        <Chip cls="bg-ink-100 text-ink-500"><Lock className="h-3 w-3" />Interno</Chip>
      </p>
      <TextareaField placeholder="Observações da equipe técnica, pendências, combinados internos" value={notas}
        disabled={!podeEditar} onChange={(e) => setNotas(e.target.value)} />
      <p className="mt-1.5 text-[12.5px] text-ink-400">Fica só no registro interno. Não entra na pré-visualização, no PDF nem na publicação ao portal do cliente.</p>
    </div>
  );
}

function Tabela({ cab, linhas, titulo, tag }: { cab: string[]; linhas: ReactNode[][]; titulo: string; tag?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-[13.5px] font-bold text-ink-900">{titulo}</h4>
        {tag && <Chip cls="bg-ink-100 text-ink-500">{tag}</Chip>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-ink-100">
        <table className="w-full text-[13px]">
          <thead className="bg-ink-50">
            <tr>{cab.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 text-left text-[11.5px] font-bold uppercase text-ink-400">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {linhas.length === 0
              ? <tr><td colSpan={cab.length} className="px-3 py-4 text-center text-ink-400">Nada registrado no período.</td></tr>
              : linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} className="px-3 py-2 text-ink-700">{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cartoes({ itens }: { itens: { valor: ReactNode; rotulo: string; cls?: string }[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
      {itens.map((i) => (
        <div key={i.rotulo} className={cn('rounded-lg border border-ink-100 px-3.5 py-3', i.cls)}>
          <p className="text-lg font-bold tabular-nums">{i.valor}</p>
          <p className="text-[12px] text-ink-500">{i.rotulo}</p>
        </div>
      ))}
    </div>
  );
}

function PainelBloco({ bloco, podeEditar, osId, especies, onIncluir, onFrequencia, onTexto, onCaptura }: {
  bloco: Bloco; podeEditar: boolean; osId: string; especies: string[];
  onIncluir: () => void; onFrequencia: (f: Frequencia) => void; onTexto: (t: string) => void;
  onCaptura: (clientePontoId: string, especie: string | null) => void;
}) {
  const motivoOculto = bloco.servico === 'CN' ? 'Situação atípica, use apenas quando o cliente exigir. '
    : bloco.servico === 'CMP' ? 'Bloco opcional, inclua quando o cliente pedir. ' : '';
  return (
    <Painel titulo={bloco.titulo}>
      <p className="-mt-2 text-[13px] text-ink-500">
        {bloco.servico === 'CN' ? 'Lançado no Backoffice' : 'Pré-preenchido pelo Monitoramento da OS'} · {bloco.resumo}
      </p>

      {!bloco.incluido && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-ink-200 bg-[#fafbfa] px-4 py-2.5 text-[13px] text-ink-500">
          <EyeOff className="h-4 w-4 shrink-0" />
          <span className="flex-1">Bloco oculto. {motivoOculto}Não entra na pré-visualização nem no PDF.</span>
          {podeEditar && <Button variant="secondary" size="sm" onClick={onIncluir}>Incluir no relatório</Button>}
        </div>
      )}

      {bloco.frequenciaPadrao && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-semibold text-ink-700">Frequência do monitoramento</span>
          <div className="flex gap-1 rounded-[11px] bg-[#eef0ee] p-1">
            {FREQS.map((f) => (
              <button key={f.key} disabled={!podeEditar} onClick={() => onFrequencia(f.key)}
                className={cn('rounded-lg px-3 py-1 text-[13px] font-semibold', bloco.frequencia === f.key ? 'bg-white text-forest-700 shadow-sm' : 'text-ink-500')}>
                {f.label}
              </button>
            ))}
          </div>
          {'visitas' in bloco && <span className="ml-auto text-[12.5px] text-ink-400">{rotuloDoPeriodo(bloco.visitas)}</span>}
        </div>
      )}

      <ConteudoDoBloco bloco={bloco} podeEditar={podeEditar} osId={osId} especies={especies} onCaptura={onCaptura} />

      <TextareaField label="Bloco descritivo deste serviço" placeholder="Análise técnica deste serviço nesta área"
        value={bloco.texto} disabled={!podeEditar} onChange={(e) => onTexto(e.target.value)} />
      <p className="-mt-2 text-[12.5px] text-ink-400">Entra no bloco correspondente do PDF. Salvar em Campos complementares gera uma nova versão.</p>
    </Painel>
  );
}

function ChipValor({ v, bg, fg, title }: { v: ReactNode; bg: string; fg: string; title?: string }) {
  return <span title={title} className="inline-flex min-w-[26px] items-center justify-center rounded-md px-1.5 py-0.5 text-[12px] font-bold" style={{ background: bg, color: fg }}>{v}</span>;
}

function ConteudoDoBloco({ bloco, podeEditar, osId, especies, onCaptura }: {
  bloco: Bloco; podeEditar: boolean; osId: string; especies: string[]; onCaptura: (clientePontoId: string, especie: string | null) => void;
}) {
  if (bloco.tipo === 'aplicacao') {
    return (
      <>
        <Tabela titulo="Produtos utilizados e registro de aplicação" tag="Lançado no app pelo técnico"
          cab={['Produto utilizado', 'Lote', 'Técnica', 'Áreas de atuação', 'Quantidade']}
          linhas={bloco.aplicacoes.map((a) => [a.produto, a.lote, a.tecnica, a.areas, a.quantidade])} />
        <p className="text-[12.5px] text-ink-400">A Desinsetização é registro de aplicação: não usa a classificação de status 1 a 4, exclusiva dos blocos de Desratização.</p>
      </>
    );
  }
  if (bloco.tipo === 'status' || bloco.tipo === 'captura') {
    const cor = new Map(bloco.legenda.map((l) => [String(l.codigo), l]));
    const captura = bloco.tipo === 'captura';
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {bloco.legenda.map((l) => (
            <span key={String(l.codigo)} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-700">
              <ChipValor v={l.codigo} bg={l.bg} fg={l.fg} />{l.nome}
            </span>
          ))}
        </div>
        <Tabela
          titulo="Pontos e status por visita" tag={captura ? 'Lançado no Backoffice' : 'Registrado no app pelo técnico'}
          cab={['Nº', 'Localização', ...bloco.visitas.map((v) => ddmm(v.data))]}
          linhas={bloco.linhas.map((l) => [
            <span key="c" className="font-semibold text-ink-900">{l.codigo}</span>,
            l.local,
            ...bloco.visitas.map((v) => {
              const c = l.celulas[v.os_id];
              // Captura desta visita é editável; as das outras visitas são lidas.
              if (captura && v.os_id === osId && podeEditar) {
                return (
                  <select key={v.os_id} aria-label={`Captura em ${l.codigo}`} value={c ? c.rotulo : ''}
                    onChange={(e) => onCaptura(l.chave, e.target.value || null)}
                    className="rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[12px]">
                    <option value="">Sem captura</option>
                    {especies.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                );
              }
              if (!c) return <span key={v.os_id} className="text-ink-300" title={captura ? 'Sem captura' : undefined}>—</span>;
              const l2 = cor.get(String(c.valor));
              return <ChipValor key={v.os_id} v={c.valor} bg={l2?.bg ?? '#f2f3f4'} fg={l2?.fg ?? '#686f7d'} title={`${c.valor} · ${c.rotulo}`} />;
            }),
          ])}
        />
        <div>
          <h4 className="mb-2 text-[13.5px] font-bold text-ink-900">{captura ? 'Capturas no período por tipo' : 'Totais por status no período'}</h4>
          <Cartoes itens={bloco.totais.map((t) => ({ valor: t.n, rotulo: captura ? t.nome : `${t.codigo} · ${t.nome}` }))} />
        </div>
      </>
    );
  }
  if (bloco.tipo === 'contagem') {
    return (
      <>
        <Tabela titulo="Contagem por Armadilha" tag="Lançado no app pelo técnico"
          cab={['Nº', 'Localização', ...bloco.especies, 'Total']}
          linhas={bloco.linhas.map((l) => [
            <span key="c" className="font-semibold text-ink-900">{l.codigo}</span>, l.local,
            ...bloco.especies.map((e) => l.contagens[e] ?? 0), <b key="t">{l.total}</b>,
          ])} />
        <div>
          <h4 className="mb-2 text-[13.5px] font-bold text-ink-900">Consolidação geral do período</h4>
          <Cartoes itens={[
            ...bloco.especies.map((e) => ({ valor: bloco.linhas.reduce((t, l) => t + (l.contagens[e] ?? 0), 0), rotulo: e })),
            { valor: bloco.totalGeral, rotulo: `Total capturado · ${bloco.linhas.length} ${bloco.linhas.length === 1 ? 'armadilha' : 'armadilhas'} no período` },
            { valor: bloco.indiceMedio.toLocaleString('pt-BR'), rotulo: 'Índice médio por armadilha' },
          ]} />
        </div>
        <p className="text-[12.5px] text-ink-400">A contagem não usa a legenda de status 1 a 4.</p>
      </>
    );
  }
  if (bloco.tipo === 'ocorrencia') {
    return (
      <>
        <Tabela titulo="Ocorrências setoriais do período" tag="Planilha de Monitoramento · registros da execução"
          cab={['Data', 'Setor', 'Ocorrência apontada', 'Praga / indício', 'Ação']}
          linhas={bloco.linhas.map((l) => [br(l.data), l.setor, l.ocorrencia, l.praga, l.acao])} />
        <Cartoes itens={[{ valor: bloco.linhas.length, rotulo: 'Ocorrências no período' }]} />
      </>
    );
  }
  // Comparativo: a série mês a mês e os gráficos entram no PR 23.
  if (bloco.tipo !== 'comparativo') return null;
  return (
    <>
      <Tabela titulo="Iscas consumidas × placas com ocorrência, por visita"
        cab={['Visita', 'Iscas consumidas', 'Placas com ocorrência']}
        linhas={bloco.serie.map((s) => [br(s.data), s.iscas, s.placas])} />
      <Cartoes itens={[
        { valor: bloco.totalIscas, rotulo: 'Iscas consumidas no período' },
        { valor: bloco.totalPlacas, rotulo: 'Placas com ocorrência no período' },
      ]} />
    </>
  );
}

function DadosExecucao({ rel, grupos }: { rel: RelatorioAberto; grupos: GrupoDeBlocos[] }) {
  const { dados } = rel;
  const os = dados.os;
  const pontosDaOs = dados.pontos.filter((p) => p.os_id === os.id);
  const porArea = grupos.map((g) => {
    const ids = new Set(g.blocos.flatMap((b) => ('linhas' in b && b.tipo !== 'captura' && b.tipo !== 'ocorrencia' ? b.linhas.map((l) => l.chave) : [])));
    const pts = pontosDaOs.filter((p) => ids.has(p.cliente_ponto_id ?? p.id));
    return {
      area: g.areaNome, total: pts.length,
      verificados: pts.filter((p) => p.situacao && p.situacao !== 'pendente').length,
      naoConformes: pts.filter((p) => p.situacao === 'nao_conforme').length,
    };
  }).filter((a) => a.total > 0);
  return (
    <div className="space-y-5">
      <Painel titulo="Cliente e serviço">
        <Linhas linhas={[
          ['Cliente', os.cliente.nome],
          ['Local', os.endereco_execucao || os.cliente.endereco || '—'],
          ['Tipo de serviço', os.tipos.join(', ') || '—'],
          ['Data de execução', br(os.data_execucao)],
          ['Equipe técnica', os.equipe.join(' · ') || os.tecnico_executor || '—'],
          ['Pontos', `${pontosDaOs.length} pontos · ${pontosDaOs.filter((p) => p.situacao && p.situacao !== 'pendente').length} verificados`],
        ]} />
      </Painel>
      <p className="rounded-lg bg-ink-50 px-4 py-2.5 text-[13px] text-ink-500">
        Os produtos utilizados ficam no bloco do serviço correspondente, junto com técnica, área e quantidade. Veja em Blocos do relatório.
      </p>
      <Tabela titulo="Mapeamento e pontos verificados" cab={['Área', 'Pontos', 'Verificados', 'Não conformes']}
        linhas={porArea.map((a) => [a.area, a.total, a.verificados, a.naoConformes])} />
      <Painel titulo="Assinaturas coletadas">
        <Linhas linhas={[
          ['Responsável no cliente', os.assinante_nome || '—'],
          ['Técnico responsável', os.tecnico_executor || '—'],
        ]} />
      </Painel>
    </div>
  );
}
