import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Copy, Lock, ChevronRight } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { imprimirFicha } from '@/lib/impressao';
import {
  getOrdemServico, updateDadosGerais, duplicarOs,
  osStatusLabel, osStatusTone, isReadOnly, fmtDateTime,
  type OrdemServicoDetail, type OsStatus,
} from '@/lib/operacional';
import {
  listPlanos, listPontos, salvarPonto, definirPontosPrevistos,
  situacaoPontoLabel, situacaoPontoTone,
  type PlanoControle, type PontoPlano,
} from '@/lib/orcamentos';
import { acoesDisponiveis, aplicarAcao, FLUXO, type AcaoFluxo } from '@/lib/emitirOs';

const ETAPAS = ['Planejamento', 'Execução', 'Revisão'];

/** Tela 3.1.3 - Emitir ordem de serviço. */
export function EmitirOs() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const podeEditar = can('operacional', 'editar');

  const [os, setOs] = useState<OrdemServicoDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [planos, setPlanos] = useState<PlanoControle[]>([]);
  const [plano, setPlano] = useState<PlanoControle | null>(null);
  const [pontos, setPontos] = useState<PontoPlano[]>([]);
  const [acao, setAcao] = useState<AcaoFluxo | null>(null);
  const [motivo, setMotivo] = useState('');
  const [novaData, setNovaData] = useState('');
  const [exec, setExec] = useState({
    hora_comprometida: '', etapa: '', contato: '', data_validade: '', observacoes: '',
  });

  const load = useCallback(async () => {
    try {
      // A OS primeiro, sozinha: com `Promise.all`, um id inexistente fazia
      // `listPlanos` estourar antes, o erro caía no catch e a tela ficava em
      // "Carregando…" para sempre — o único estado que ela sabia representar.
      const o = await getOrdemServico(id);
      if (!o) { setNotFound(true); return; }
      setOs(o);
      setExec({
        hora_comprometida: o.hora_comprometida ?? '',
        etapa: o.etapa ?? '',
        contato: o.contato ?? '',
        data_validade: o.data_validade ?? '',
        observacoes: o.observacoes ?? '',
      });
      setPlanos(await listPlanos(id));
    } catch (e) {
      setNotFound(true);
      showToast((e as Error).message);
    }
  }, [id, showToast]);
  useEffect(() => { load(); }, [load]);

  const abrirPlano = async (p: PlanoControle) => {
    setPlano(p);
    try { setPontos(await listPontos(p.id)); } catch (e) { showToast((e as Error).message); }
  };

  const executar = async () => {
    if (!acao || !os) return;
    try {
      const r = await aplicarAcao(id, os.status, acao.chave, { motivo, novaData });
      setAcao(null); setMotivo(''); setNovaData('');
      showToast(r.mensagem);
      load();
    } catch (e) { showToast((e as Error).message); }
  };

  const salvarExecucao = async () => {
    try {
      await updateDadosGerais(id, {
        hora_comprometida: exec.hora_comprometida || null,
        etapa: exec.etapa || null,
        contato: exec.contato || null,
        data_validade: exec.data_validade || null,
        observacoes: exec.observacoes || null,
      } as never);
      showToast('Dados da execução salvos'); load();
    } catch (e) { showToast((e as Error).message); }
  };

  if (notFound) {
    return (
      <>
        <Topbar title="Ordem de serviço" breadcrumb="Início  /  Operacional" />
        <div className="flex-1 px-8 py-6">
          <p className="text-sm text-ink-500">OS não encontrada.</p>
          <Button variant="secondary" className="mt-3" onClick={() => navigate('/operacional')}>Voltar para a lista</Button>
        </div>
      </>
    );
  }
  if (!os) {
    return (<><Topbar title="Ordem de serviço" breadcrumb="Início  /  Operacional" /><div className="flex-1 px-8 py-6 text-sm text-ink-400">Carregando…</div></>);
  }

  const encerrada = isReadOnly(os.status);
  const disponiveis = podeEditar ? acoesDisponiveis(os.status) : [];

  return (
    <>
      <Topbar title={os.codigo} breadcrumb={`Início  /  Operacional  /  ${os.codigo}  /  Emitir`} />
      <div className="flex-1 px-8 py-6">
        <button onClick={() => navigate(`/operacional/${id}`)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar ao detalhe
        </button>

        {/* Cabeçalho */}
        <div className="mb-5 rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[19px] font-bold text-ink-900">{os.codigo}</h2>
                <Badge tone={osStatusTone[os.status]}>{osStatusLabel[os.status]}</Badge>
              </div>
              <p className="mt-1 text-[13px] text-ink-500">
                Cliente: <Link to={`/clientes/${os.clienteId}`} className="font-semibold text-forest-700 hover:underline">{os.cliente}</Link>
                {os.orcamentoCodigo && <> · Origem: {os.orcamentoCodigo}</>}
                {os.data_programada && <> · Data programada: {os.data_programada.split('-').reverse().join('/')}</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => {
                const ok = imprimirFicha({
                  titulo: `Planejamento · ${os.codigo}`,
                  subtitulo: os.cliente,
                  campos: [
                    { rotulo: 'Situação', valor: osStatusLabel[os.status] },
                    { rotulo: 'Etapa', valor: exec.etapa || '—' },
                    { rotulo: 'Contato', valor: exec.contato || '—' },
                  ],
                }, [{
                  titulo: 'Planos de controle',
                  colunas: [
                    { titulo: 'Tipo', valor: (p: PlanoControle) => p.tipoControle },
                    { titulo: 'Frequência', valor: (p: PlanoControle) => p.frequencia },
                    { titulo: 'Pontos', valor: (p: PlanoControle) => `${p.pontosPreenchidos}/${p.pontosPrevistos}`, numerica: true },
                  ],
                  linhas: planos,
                }]);
                if (!ok) showToast('O navegador bloqueou a janela. Autorize os pop-ups deste site.');
              }}>
                <Printer className="h-4 w-4" />Imprimir
              </Button>
              <Button variant="secondary" size="sm" onClick={() =>
                duplicarOs(id).then((n) => navigate(`/operacional/${n}?editar=1`)).catch((e) => showToast((e as Error).message))}>
                <Copy className="h-4 w-4" />Copiar planejamento
              </Button>
            </div>
          </div>

          {encerrada && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 px-3.5 py-2 text-[13px] text-ink-500">
              <Lock className="h-4 w-4" />
              OS {osStatusLabel[os.status].toLowerCase()} — o fluxo está encerrado.
            </div>
          )}
        </div>

        {/* Fluxo de situação */}
        <div className="mb-5 rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <h3 className="text-[15px] font-bold text-ink-900">Fluxo de situação</h3>
          <p className="mb-3 text-[13px] text-ink-500">Cada ação altera a situação e pode disparar um efeito.</p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FLUXO.map((a) => {
              const habilitada = disponiveis.some((d) => d.chave === a.chave);
              return (
                <button
                  key={a.chave}
                  disabled={!habilitada}
                  onClick={() => { setAcao(a); setMotivo(''); setNovaData(os.data_programada ?? ''); }}
                  title={habilitada ? '' : `Indisponível com a OS em "${osStatusLabel[os.status]}"`}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition',
                    habilitada
                      ? a.destrutiva
                        ? 'border-ink-200 bg-white hover:border-danger-bright hover:text-danger-bright'
                        : 'border-ink-200 bg-white hover:border-forest-500'
                      : 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300',
                  )}
                >
                  <span className={cn('text-[11px] font-bold', habilitada ? 'text-ink-400' : 'text-ink-300')}>{a.n}</span>
                  <span className="text-[13px] font-semibold">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Planos de controle */}
        <div className="mb-5 rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <h3 className="text-[15px] font-bold text-ink-900">Planos de controle</h3>
          <p className="mb-3 text-[13px] text-ink-500">
            Apenas os planos contratados no orçamento de origem. Clique para preencher os pontos.
          </p>

          {planos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-[13px] text-ink-400">
              Esta OS não veio de um orçamento com tipos de controle contratados.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {planos.map((p) => {
                const completo = p.pontosPrevistos > 0 && p.pontosPreenchidos >= p.pontosPrevistos;
                return (
                  <button
                    key={p.id}
                    onClick={() => abrirPlano(p)}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition hover:border-forest-500',
                      completo ? 'border-forest-500 bg-forest-50' : 'border-ink-200 bg-white',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">{p.tipoControle}</span>
                      <span className="block text-[12px] text-ink-500">
                        {p.frequencia} · {p.pontosPreenchidos}/{p.pontosPrevistos} pontos
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dados da execução */}
        <div className="rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink-900">Dados da execução</h3>
            {podeEditar && !encerrada && <Button size="sm" onClick={salvarExecucao}>Salvar</Button>}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <TextField label="Código" value={os.codigo} readOnly className="bg-ink-50" />
            <TextField label="Data programada" value={os.data_programada ? os.data_programada.split('-').reverse().join('/') : '—'} readOnly className="bg-ink-50" />
            <TextField label="Horário agendado" value={os.hora_prevista ?? '—'} readOnly className="bg-ink-50" />

            <TextField label="Horário comprometido" placeholder="Ex.: 08:00 às 12:00"
              value={exec.hora_comprometida} disabled={!podeEditar || encerrada}
              onChange={(e) => setExec((s) => ({ ...s, hora_comprometida: e.target.value }))} />
            <SelectField label="Etapa" value={exec.etapa} disabled={!podeEditar || encerrada}
              onChange={(e) => setExec((s) => ({ ...s, etapa: e.target.value }))}
              options={[{ value: '', label: 'Sem etapa' }, ...ETAPAS.map((x) => ({ value: x, label: x }))]} />
            <TextField label="Data de validade" type="date" value={exec.data_validade} disabled={!podeEditar || encerrada}
              onChange={(e) => setExec((s) => ({ ...s, data_validade: e.target.value }))} />

            <TextField label="Contato no local" value={exec.contato} disabled={!podeEditar || encerrada}
              onChange={(e) => setExec((s) => ({ ...s, contato: e.target.value }))} />
            <TextField label="Início da execução" value={fmtDateTime(os.inicio_execucao)} readOnly className="bg-ink-50" />
            <TextField label="Término da execução" value={fmtDateTime(os.termino_execucao)} readOnly className="bg-ink-50" />

            <div className="md:col-span-3">
              <TextareaField label="Observação" rows={2} value={exec.observacoes} disabled={!podeEditar || encerrada}
                onChange={(e) => setExec((s) => ({ ...s, observacoes: e.target.value }))} />
            </div>
          </div>

          <p className="mt-3 text-[13px] text-ink-500">
            {os.email_enviado
              ? `E-mail enviado ao cliente em ${fmtDateTime(os.email_enviado_em)}.`
              : 'E-mail ao cliente ainda não enviado — use a ação 02 do fluxo.'}
          </p>
        </div>
      </div>

      {/* Confirmação da ação */}
      {acao && (
        <Modal open onClose={() => setAcao(null)}>
          <div className="border-b border-ink-100 px-7 py-[22px]">
            <h2 className="text-[19px] font-bold text-ink-900">{acao.n} · {acao.label}</h2>
            {acao.para && <p className="mt-1 text-[13px] text-ink-500">A situação passa para "{osStatusLabel[acao.para as OsStatus]}".</p>}
            {acao.efeito === 'baixar_estoque' && <p className="mt-1 text-[13px] text-ink-500">Gera saída de estoque do consumo informado.</p>}
            {acao.efeito === 'email' && <p className="mt-1 text-[13px] text-ink-500">Marca que o cliente foi avisado.</p>}
          </div>
          <div className="flex flex-col gap-4 px-7 py-6">
            {acao.efeito === 'nova_data' && (
              <TextField label="Nova data" required type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
            )}
            {acao.exigeMotivo && (
              <TextareaField label="Motivo" required rows={3} value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Fica registrado no histórico da OS." />
            )}
            {!acao.exigeMotivo && acao.efeito !== 'nova_data' && (
              <p className="text-[13px] text-ink-500">Confirma registrar esta ação?</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
            <Button variant="secondary" onClick={() => setAcao(null)}>Cancelar</Button>
            <Button variant={acao.destrutiva ? 'destructive' : 'primary'} onClick={executar}>{acao.label}</Button>
          </div>
        </Modal>
      )}

      {/* Pontos do plano */}
      {plano && (
        <Drawer
          open
          onClose={() => setPlano(null)}
          title={plano.tipoControle}
          subtitle={`${plano.frequencia} · ${pontos.filter((p) => p.situacao !== 'pendente').length} de ${pontos.length} preenchidos`}
          width={560}
        >
          <div className="mb-4 flex items-end gap-2">
            <TextField
              label="Quantidade de pontos" type="number" min={0} max={200}
              value={String(plano.pontosPrevistos)} disabled={!podeEditar || encerrada}
              onChange={(e) => setPlano({ ...plano, pontosPrevistos: Number(e.target.value) })}
            />
            <Button
              size="sm"
              disabled={!podeEditar || encerrada}
              onClick={async () => {
                try {
                  await definirPontosPrevistos(plano.id, plano.pontosPrevistos);
                  setPontos(await listPontos(plano.id));
                  const atualizados = await listPlanos(id);
                  setPlanos(atualizados);
                  showToast('Pontos atualizados');
                } catch (e) { showToast((e as Error).message); }
              }}
            >
              Aplicar
            </Button>
          </div>

          {pontos.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-400">
              Defina quantos pontos este plano tem para começar a preencher.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pontos.map((p) => (
                <div key={p.id} className="rounded-xl border border-ink-100 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">
                      {p.numero}
                    </span>
                    <TextField
                      className="flex-1" placeholder="Identificação do ponto (ex.: Doca 1)"
                      value={p.identificacao} disabled={!podeEditar || encerrada}
                      onChange={(e) => setPontos((ps) => ps.map((x) => (x.id === p.id ? { ...x, identificacao: e.target.value } : x)))}
                      onBlur={() => salvarPonto(p.id, { identificacao: p.identificacao }).catch((e) => showToast((e as Error).message))}
                    />
                    <Badge tone={situacaoPontoTone[p.situacao]}>{situacaoPontoLabel[p.situacao]}</Badge>
                  </div>
                  <SelectField
                    value={p.situacao} disabled={!podeEditar || encerrada}
                    onChange={async (e) => {
                      const situacao = e.target.value as PontoPlano['situacao'];
                      setPontos((ps) => ps.map((x) => (x.id === p.id ? { ...x, situacao } : x)));
                      try {
                        await salvarPonto(p.id, { situacao });
                        setPlanos(await listPlanos(id));
                      } catch (err) { showToast((err as Error).message); }
                    }}
                    options={(Object.keys(situacaoPontoLabel) as PontoPlano['situacao'][]).map((s) => ({ value: s, label: situacaoPontoLabel[s] }))}
                  />
                </div>
              ))}
            </div>
          )}
        </Drawer>
      )}
    </>
  );
}
