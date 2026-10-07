import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Cloud, CloudOff, CloudUpload, Download, Eye, EyeOff, GitCompare, History, Image as ImageIcon, Lock, Mail, Printer, RefreshCw, Save, TrendingDown, TrendingUp } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { rotuloStatus } from '@/lib/statusOs';
import {
  MESES_CURTOS, contagemDeBlocos, ddmm, montarBlocos, rotuloDoPeriodo,
  type Bloco, type ConteudoVersao, type Frequencia, type GrupoDeBlocos, type Meses, type Tendencia,
} from '@/lib/relatorio';
import { CORES_GRAFICO, graficoDeBarras, type Serie } from '@/lib/graficos';
import {
  abrirRelatorio, enviarRelatorio, lancarCaptura, listarVersoes, pdfDoRelatorio, publicarRelatorio, salvarVersao, urlsDasFotos,
  type RelatorioAberto, type Versao,
} from '@/lib/relatoriosTecnicos';

type Aba = 'blocos' | 'exec' | 'compl' | 'pdf' | 'hist';
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
 * Abas: Blocos do relatório, Dados da execução, Campos complementares (onde
 * se salva), Pré-visualização e Versões. Rodapé: Imprimir, Baixar PDF,
 * Enviar por e-mail e Publicar no portal do cliente — todos pelo mesmo PDF
 * (Edge Function `relatorio`).
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
  const [confirmar, setConfirmar] = useState<'publicar' | 'enviar' | null>(null);
  const [ocupado, setOcupado] = useState(false);

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

  /** PDF de uma versão (atual, se não disser qual), aberto numa aba nova ou baixado. */
  const comPdf = async (numero: number | undefined, destino: 'abrir' | 'baixar' | 'imprimir') => {
    if (!rel) return;
    setOcupado(true);
    try {
      const blob = await pdfDoRelatorio(osId, { acao: 'pdf', numero });
      const url = URL.createObjectURL(blob);
      const nome = `relatorio-tecnico-${rel.dados.os.codigo.toLowerCase()}-v${numero ?? rel.versaoAtual}.pdf`;
      if (destino === 'baixar') {
        const a = document.createElement('a');
        a.href = url; a.download = nome; a.click();
      } else {
        const janela = window.open(url, '_blank');
        if (!janela) showToast('O navegador bloqueou a janela. Autorize os pop-ups deste site.');
        else if (destino === 'imprimir') showToast(`Enviado para a impressora · relatório técnico ${rel.dados.os.codigo}`);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const executar = async (acao: 'publicar' | 'enviar') => {
    if (!rel) return;
    setConfirmar(null);
    setOcupado(true);
    try {
      const r = acao === 'publicar' ? await publicarRelatorio(osId) : await enviarRelatorio(osId);
      const para = r.enviados.join(', ');
      showToast(acao === 'publicar'
        ? `${rel.dados.os.codigo} · v${r.numero} publicada no portal${para ? ` · e-mail para ${para}` : ''}`
        : `Relatório de ${rel.dados.os.codigo} enviado para ${para}`);
      if (r.motivo) showToast(`Publicado, mas o e-mail não saiu para todos: ${r.motivo}`);
      onSalvo();
      carregar();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setOcupado(false);
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
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => comPdf(undefined, 'imprimir')} disabled={ocupado}><Printer className="h-4 w-4" />Imprimir</Button>
            <Button variant="secondary" onClick={() => comPdf(undefined, 'baixar')} disabled={ocupado}><Download className="h-4 w-4" />Baixar PDF</Button>
            {podeEditar && <Button variant="secondary" onClick={() => setConfirmar('enviar')} disabled={ocupado}><Mail className="h-4 w-4" />Enviar por e-mail</Button>}
            {podeEditar && (
              <Button className="ml-auto" onClick={() => setConfirmar('publicar')} disabled={ocupado}>
                <CloudUpload className="h-4 w-4" />Publicar no portal do cliente
              </Button>
            )}
          </div>
        }
        headerExtra={
          <div className="flex gap-1.5 pb-3">
            {([
              ['blocos', `Blocos do relatório (${contagem.incluidos} de ${contagem.total})`],
              ['exec', 'Dados da execução'],
              ['compl', 'Campos complementares'],
              ['pdf', 'Pré-visualização'],
              ['hist', `Versões (${rel.versaoAtual})`],
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
          {aba === 'pdf' && <AbaPrevia osId={osId} rascunho={rascunho} sujo={sujo} versao={rel.versaoAtual} />}
          {aba === 'hist' && <AbaVersoes osId={osId} codigo={os.codigo} versaoAtual={rel.versaoAtual} onAbrirPdf={(n) => comPdf(n, 'abrir')} />}
          {aba === 'compl' && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 rounded-lg bg-[#eef8ee] px-4 py-2.5 text-[13px] text-[#2e6b31]">
                <History className="h-4 w-4" />Toda edição salva gera automaticamente uma nova versão do relatório: as anteriores ficam preservadas no histórico.
              </p>
              <CamposTexto rascunho={rascunho} editar={(p) => { editar(p); setErros((e) => ({ ...e, ...Object.fromEntries(Object.keys(p).map((k) => [k, undefined])) })); }} erros={erros} podeEditar={podeEditar} />
              <Galeria fotos={dados.fotos} codigo={os.codigo} cliente={os.cliente.nome} />
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
        open={!!confirmar}
        title={confirmar === 'publicar' ? `Publicar a v${rel.versaoAtual} no portal do cliente?` : `Enviar a v${rel.versaoAtual} por e-mail?`}
        description={
          (confirmar === 'publicar'
            ? 'O cliente passa a ver o PDF no Portal, recebe um aviso e o PDF por e-mail (contatos marcados como "Rel. técnica"). Uma publicação anterior deste relatório sai do ar.'
            : 'O PDF da última versão vai para os contatos do cliente marcados como "Rel. técnica", sem publicar no Portal.')
          + (sujo ? ` Há alterações não salvas: vale a v${rel.versaoAtual} salva.` : '')
        }
        confirmLabel={confirmar === 'publicar' ? 'Publicar' : 'Enviar'}
        onConfirm={() => confirmar && executar(confirmar)}
        onClose={() => setConfirmar(null)}
      />

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
        <TabelaMeses titulo="Consolidação anual" sub="Evolução mês a mês · meses sem visita aparecem sem valor"
          primeira="Classificação" mesAtual={bloco.consolidacao.mesAtual}
          linhas={bloco.consolidacao.linhas.map((l) => ({ rotulo: captura ? l.nome : `${l.codigo} · ${l.nome}`, valores: l.valores }))} />
        <TendenciaBloco t={bloco.tendencia} />
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
        <div>
          <h4 className="mb-2 text-[13.5px] font-bold text-ink-900">Evolução mensal do total capturado</h4>
          <Grafico series={[{ nome: 'Total', cor: CORES_GRAFICO.total, valores: bloco.mensal.total }]} mesAtual={bloco.mensal.mesAtual} rotulos />
        </div>
        <TabelaMeses titulo="Visão mensal por tipo" sub="Meses sem visita aparecem sem valor" primeira="Tipo"
          mesAtual={bloco.mensal.mesAtual} linhas={bloco.mensal.porTipo.map((t) => ({ rotulo: t.especie, valores: t.valores }))} />
        <TendenciaBloco t={bloco.tendencia} />
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
        <TabelaMeses titulo="Visão por período" sub="Meses sem visita aparecem sem valor" primeira="Situação"
          mesAtual={bloco.mensal.mesAtual} linhas={[{ rotulo: 'Registradas', valores: bloco.mensal.registradas }]} />
        <TendenciaBloco t={bloco.tendencia} />
      </>
    );
  }
  if (bloco.tipo !== 'comparativo') return null;
  const ultimo = MESES_CURTOS[Math.max(0, bloco.mesAtual - 1)];
  return (
    <>
      <div>
        <h4 className="text-[13.5px] font-bold text-ink-900">Iscas consumidas × placas com ocorrência, mês a mês</h4>
        <p className="mb-2 text-[12.5px] text-ink-400">
          {bloco.portaIscas} porta-iscas e {bloco.placasAdesivas} placas adesivas · {bloco.areaNome} · Jan a {ultimo} {bloco.ano}
        </p>
        <Legenda itens={[{ nome: 'Iscas consumidas', cor: CORES_GRAFICO.iscas }, { nome: 'Placas com ocorrência', cor: CORES_GRAFICO.placas }]} />
        <Grafico mesAtual={bloco.mesAtual} series={[
          { nome: 'Iscas consumidas', cor: CORES_GRAFICO.iscas, valores: bloco.iscas },
          { nome: 'Placas com ocorrência', cor: CORES_GRAFICO.placas, valores: bloco.placas },
        ]} />
      </div>
      <Cartoes itens={[
        { valor: bloco.totalIscas, rotulo: `Iscas consumidas no acumulado ${bloco.ano}` },
        { valor: bloco.totalPlacas, rotulo: `Placas com ocorrência no acumulado ${bloco.ano}` },
      ]} />
      <p className="text-[13px] text-ink-700">{bloco.relacao}</p>
      <TabelaMeses titulo="Mês a mês" primeira="" mesAtual={bloco.mesAtual} linhas={[
        { rotulo: 'Iscas consumidas', valores: bloco.iscas },
        { rotulo: 'Placas com ocorrência', valores: bloco.placas },
      ]} />
    </>
  );
}

/** Gráfico de barras compartilhado com o PDF (`lib/graficos.ts`). */
function Grafico({ series, mesAtual, rotulos }: { series: Serie[]; mesAtual: number; rotulos?: boolean }) {
  // O SVG é montado só com números e rótulos fixos, e o texto é escapado em `graficoDeBarras`.
  const svg = graficoDeBarras({ categorias: MESES_CURTOS, series, mesAtual, rotulos, largura: 640, altura: 180 });
  return <div className="overflow-x-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Legenda({ itens }: { itens: { nome: string; cor: string }[] }) {
  return (
    <div className="mb-1 flex flex-wrap gap-4 text-[12.5px] text-ink-500">
      {itens.map((i) => (
        <span key={i.nome} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.cor }} />{i.nome}</span>
      ))}
    </div>
  );
}

/** Tabela Jan–Dez: "—" sem valor (mês sem visita ou ainda por vir); zero em cinza. */
function TabelaMeses({ titulo, sub, primeira, linhas, mesAtual }: {
  titulo: string; sub?: string; primeira: string; linhas: { rotulo: string; valores: Meses }[]; mesAtual: number;
}) {
  return (
    <div>
      {titulo && <h4 className="text-[13.5px] font-bold text-ink-900">{titulo}</h4>}
      {sub && <p className="mb-2 text-[12.5px] text-ink-400">{sub}</p>}
      <div className="overflow-x-auto rounded-lg border border-ink-100">
        <table className="w-full text-[12.5px] tabular-nums">
          <thead className="bg-ink-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11.5px] font-bold uppercase text-ink-400">{primeira}</th>
              {MESES_CURTOS.map((m) => <th key={m} className="px-2 py-2 text-center text-[11.5px] font-bold uppercase text-ink-400">{m}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {linhas.map((l) => (
              <tr key={l.rotulo}>
                <td className="whitespace-nowrap px-3 py-2 text-ink-700">{l.rotulo}</td>
                {l.valores.map((v, i) => (
                  <td key={i} className={cn('px-2 py-2 text-center', v == null || v === 0 || i + 1 > mesAtual ? 'text-ink-300' : 'font-semibold text-ink-900')}>
                    {v == null ? '—' : v.toLocaleString('pt-BR')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** "Tendência <ano anterior> × <ano>": mesmo período do ano anterior. */
function TendenciaBloco({ t }: { t: Tendencia }) {
  const ate = t.ate ? MESES_CURTOS[t.ate - 1] : null;
  const melhora = t.variacao != null && t.variacao <= 0;
  return (
    <div className="rounded-lg border border-ink-100 p-4">
      <h4 className="text-[13.5px] font-bold text-ink-900">Tendência {t.anoAnterior} × {t.ano} · {t.rotulo}</h4>
      <p className="mb-2 text-[12.5px] text-ink-400">
        {ate ? `Comparação Jan a ${ate} contra o mesmo período de ${t.anoAnterior}` : `Ainda sem visita em ${t.ano}`}
      </p>
      <Legenda itens={[{ nome: `${t.anoAnterior} · ano anterior`, cor: CORES_GRAFICO.anoAnterior }, { nome: `${t.ano} · ano atual`, cor: CORES_GRAFICO.anoAtual }]} />
      <Grafico mesAtual={12} series={[
        { nome: String(t.anoAnterior), cor: CORES_GRAFICO.anoAnterior, valores: t.anterior },
        { nome: String(t.ano), cor: CORES_GRAFICO.anoAtual, valores: t.atual.map((v, i) => (i + 1 > t.ate ? null : v)) },
      ]} />
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Cartoes itens={[
          { valor: t.somaAnterior, rotulo: `Acumulado ${t.anoAnterior} no período` },
          { valor: t.somaAtual, rotulo: `Acumulado ${t.ano} no período` },
        ]} />
        {t.variacao == null
          ? <Chip cls="bg-ink-100 text-ink-500">Sem base em {t.anoAnterior} para comparar</Chip>
          : (
            <Chip cls={melhora ? 'bg-[#eaf6ea] text-[#1a5c1a]' : 'bg-[#fdf3e6] text-[#b45309]'}>
              {melhora ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
              {t.variacao > 0 ? '+' : ''}{t.variacao}% contra {t.anoAnterior}
            </Chip>
          )}
      </div>
      <div className="mt-3">
        <TabelaMeses titulo="" primeira="" mesAtual={12} linhas={[{ rotulo: `${t.anoAnterior} · ano anterior`, valores: t.anterior }]} />
      </div>
    </div>
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

/** Pré-visualização: o PDF gerado pela mesma função da publicação, com o rascunho atual. */
function AbaPrevia({ osId, rascunho, sujo, versao }: { osId: string; rascunho: ConteudoVersao; sujo: boolean; versao: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const gerar = useCallback(async (conteudo: ConteudoVersao) => {
    setGerando(true);
    setErro(null);
    try {
      const blob = await pdfDoRelatorio(osId, { acao: 'previa', conteudo });
      setUrl((antiga) => { if (antiga) URL.revokeObjectURL(antiga); return URL.createObjectURL(blob); });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  }, [osId]);
  // Gera ao abrir a aba; depois, pelo botão — gerar a cada tecla custaria um PDF por letra.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { gerar(rascunho); }, [gerar]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-[13px] text-ink-500">
          É o mesmo PDF que o cliente recebe ao publicar, com o cabeçalho da v{versao}.
          {sujo && ' Mostra as alterações ainda não salvas.'} Blocos ocultos e notas internas não entram.
        </p>
        <Button variant="secondary" size="sm" onClick={() => gerar(rascunho)} disabled={gerando}>
          <RefreshCw className="h-4 w-4" />Atualizar pré-visualização
        </Button>
      </div>
      {erro && <p className="text-[13px] text-danger-bright">{erro}</p>}
      {gerando && !url && <p className="text-[13px] text-ink-500">Gerando o PDF…</p>}
      {url && <iframe title="Pré-visualização do relatório" src={url} className="h-[70vh] w-full rounded-lg border border-ink-100" />}
    </div>
  );
}

const CAMPOS_COMPARADOS: [keyof ConteudoVersao, string][] = [
  ['observacoes', 'Observações técnicas'], ['recomendacoes', 'Recomendações ao cliente'],
  ['parecer', 'Parecer técnico'], ['sugestoes', 'Sugestões de melhoria'],
];

/** Aba Versões: histórico, visualizar o PDF de cada versão e comparar. */
function AbaVersoes({ osId, codigo, versaoAtual, onAbrirPdf }: {
  osId: string; codigo: string; versaoAtual: number; onAbrirPdf: (numero: number) => void;
}) {
  const { showToast } = useToast();
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [cmp, setCmp] = useState<[Versao, Versao] | null>(null);
  useEffect(() => { listarVersoes(osId).then(setVersoes).catch((e) => showToast((e as Error).message)); }, [osId, versaoAtual, showToast]);
  const porNumero = (n: number) => versoes.find((v) => v.numero === n);
  const comparar = (n: number) => {
    const b = porNumero(n);
    const a = porNumero(Math.max(1, n - 1));
    if (a && b) setCmp([a, b]);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-ink-900">Histórico de versões</h3>
        {versoes.length > 1 && (
          <Button variant="secondary" size="sm" onClick={() => comparar(versoes[0].numero)}><GitCompare className="h-4 w-4" />Comparar duas últimas</Button>
        )}
      </div>
      <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
        {versoes.map((v) => (
          <li key={v.numero} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Chip cls={v.numero === versaoAtual ? 'bg-[#eaf6ea] text-[#1a5c1a]' : 'bg-ink-100 text-ink-500'}>
              v{v.numero}{v.numero === versaoAtual ? ' · atual' : ''}
            </Chip>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ink-900">{v.motivo}</p>
              <p className="text-[12.5px] text-ink-400">{v.autor} · {dataHora(v.criadoEm)}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onAbrirPdf(v.numero)}><Eye className="h-4 w-4" />Visualizar</Button>
            {v.numero > 1 && <Button variant="secondary" size="sm" onClick={() => comparar(v.numero)}><GitCompare className="h-4 w-4" />Comparar</Button>}
          </li>
        ))}
      </ul>
      <Modal open={!!cmp} onClose={() => setCmp(null)}>
        {cmp && (
          <div className="w-[860px] max-w-[94vw] p-6">
            <h3 className="mb-4 text-lg font-bold text-ink-900">Comparar v{cmp[0].numero} com v{cmp[1].numero} · {codigo}</h3>
            <div className="grid grid-cols-2 gap-4">
              {cmp.map((v) => (
                <div key={v.numero} className="space-y-3 rounded-lg border border-ink-100 p-4">
                  <div className="flex items-center gap-2"><Chip cls="bg-ink-100 text-ink-500">v{v.numero}</Chip><span className="text-[12.5px] text-ink-400">{v.autor} · {dataHora(v.criadoEm)}</span></div>
                  {CAMPOS_COMPARADOS.map(([k, rotulo]) => {
                    const mudou = (cmp[0].conteudo[k] ?? '') !== (cmp[1].conteudo[k] ?? '');
                    return (
                      <div key={k}>
                        <p className="text-[12px] font-semibold text-ink-500">{rotulo}{mudou && <span className="ml-1.5 text-[#b45309]">· alterado</span>}</p>
                        <p className={cn('whitespace-pre-wrap text-[13px]', mudou ? 'text-ink-900' : 'text-ink-500')}>{String(v.conteudo[k] ?? '').trim() || '—'}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end"><Button variant="secondary" onClick={() => setCmp(null)}>Fechar comparação</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Galeria de fotos da execução (Campos complementares). */
function Galeria({ fotos, codigo, cliente }: { fotos: RelatorioAberto['dados']['fotos']; codigo: string; cliente: string }) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [aberta, setAberta] = useState<{ url: string; nome: string; n: number } | null>(null);
  useEffect(() => { urlsDasFotos(fotos.map((f) => f.caminho)).then(setUrls).catch(() => setUrls(new Map())); }, [fotos]);
  return (
    <div className="rounded-lg border border-ink-100 p-4">
      <h3 className="text-[14px] font-bold text-ink-900">Galeria de fotos da execução</h3>
      <p className="mb-3 text-[12.5px] text-ink-400">{fotos.length} {fotos.length === 1 ? 'registro anexado' : 'registros anexados'} pelo técnico no app · todas as fotos da OS ficam aqui.</p>
      {fotos.length === 0 ? <p className="text-[13px] text-ink-400">Nenhuma foto nesta execução.</p> : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
          {fotos.map((f, i) => {
            const url = urls.get(f.caminho);
            return (
              <button key={f.id} onClick={() => url && setAberta({ url, nome: f.nome, n: i + 1 })}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
                {url ? <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-ink-300" />}
              </button>
            );
          })}
        </div>
      )}
      <Modal open={!!aberta} onClose={() => setAberta(null)}>
        {aberta && (
          <div className="max-w-[90vw] p-4">
            <p className="mb-2 text-[14px] font-bold text-ink-900">Foto {aberta.n} · {codigo}</p>
            <p className="mb-3 text-[12.5px] text-ink-400">{cliente} · registro da execução · {aberta.nome}</p>
            <img src={aberta.url} alt={aberta.nome} className="max-h-[70vh] rounded-lg" />
          </div>
        )}
      </Modal>
    </div>
  );
}
