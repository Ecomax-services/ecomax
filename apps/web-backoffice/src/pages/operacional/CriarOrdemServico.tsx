import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check, Save, Upload, X } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import type { Produto } from '@/lib/estoque';
import {
  listClienteOptions, getClienteResumo, listFuncionarioOptions, listTiposServico, listPragas,
  deriveEpis, listProdutoOptions, listEquipamentoOptions, gerarCronograma, createOrdemServico,
  iniciarOsDeOrcamento, recorrenciaLabel, isPastDate,
  type Recorrencia, type NovaOsInput, type FuncionarioOption, type ClienteResumo,
} from '@/lib/operacional';

interface ProdutoLinha { produto: Produto; qtd: number; lote: string; prazo: string; }
interface EquipLinha { produto: Produto; serie: string; }

const STEPS = ['Dados gerais', 'Vincular produtos e dados', 'Revisão e conclusão'];

export function CriarOrdemServico() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const orcamentoId = params.get('orcamento');

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orcCodigo, setOrcCodigo] = useState<string | null>(null);

  // Opções
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
  const [tiposCat, setTiposCat] = useState<string[]>([]);
  const [pragasCat, setPragasCat] = useState<string[]>([]);
  const [resumo, setResumo] = useState<ClienteResumo | null>(null);

  // Etapa 1
  const [clienteId, setClienteId] = useState(params.get('cliente') ?? '');
  const [tiposServico, setTiposServico] = useState<string[]>([]);
  const [dataProgramada, setDataProgramada] = useState('');
  const [hora, setHora] = useState('');
  const [duracao, setDuracao] = useState('');
  const [recorrencia, setRecorrencia] = useState<Recorrencia>('nenhuma');
  const [funcionarioIds, setFuncionarioIds] = useState<string[]>([]);
  const [integradoId, setIntegradoId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [necessitaRelatorio, setNecessitaRelatorio] = useState(false);
  const [outrosDocs, setOutrosDocs] = useState('');

  // Etapa 2
  const [pragas, setPragas] = useState<string[]>([]);
  const [epis, setEpis] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipLinha[]>([]);
  const [cronograma, setCronograma] = useState<string[]>([]);
  const [mapaPontos, setMapaPontos] = useState<string | null>(null);
  const [pickProd, setPickProd] = useState(false);
  const [pickEquip, setPickEquip] = useState(false);

  useEffect(() => {
    listClienteOptions().then(setClientes).catch(() => {});
    listFuncionarioOptions().then(setFuncionarios).catch(() => {});
    listTiposServico().then(setTiposCat).catch(() => {});
    listPragas().then(setPragasCat).catch(() => {});
    if (orcamentoId) iniciarOsDeOrcamento(orcamentoId).then((o) => { if (o) { setClienteId(o.clienteId); setOrcCodigo(o.codigo); } }).catch(() => {});
  }, [orcamentoId]);

  // Resumo + endereço automático ao trocar cliente.
  useEffect(() => {
    if (!clienteId) { setResumo(null); return; }
    getClienteResumo(clienteId).then((r) => { setResumo(r); setEndereco((e) => e || (r.endereco !== '—' ? r.endereco : '')); }).catch(() => {});
  }, [clienteId]);

  // EPIs derivados dos produtos (read-only).
  useEffect(() => {
    deriveEpis(produtos.map((p) => p.produto.id)).then(setEpis).catch(() => setEpis([]));
  }, [produtos]);

  // Cronograma automático quando recorrente.
  useEffect(() => {
    setCronograma(recorrencia !== 'nenhuma' && dataProgramada ? gerarCronograma(dataProgramada, recorrencia) : []);
  }, [recorrencia, dataProgramada]);

  const isMonitoramento = useMemo(() => tiposServico.some((t) => /monitor|armadilha/i.test(t)), [tiposServico]);
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '—';

  const build = useCallback((rascunho: boolean): NovaOsInput => ({
    cliente_id: clienteId, orcamento_id: orcamentoId, rascunho,
    tipos_servico: tiposServico, descricao: observacoes.trim() || null,
    data_programada: dataProgramada || null, hora_prevista: hora || null, duracao_estimada: duracao.trim() || null,
    recorrencia, endereco_execucao: endereco.trim() || null,
    responsavel_admin_id: responsavelId || null, funcionario_integrado_id: integradoId || null,
    observacoes: observacoes.trim() || null, funcionario_ids: funcionarioIds,
    necessita_relatorio: necessitaRelatorio, outros_documentos: outrosDocs.trim() || null,
    pragas, epis, mapa_pontos_url: mapaPontos,
    produtos: produtos.map((l) => ({ produto_id: l.produto.id, qtd_recomendada: l.qtd, unidade: l.produto.un, lote: l.lote || null, prazo_alvo: l.prazo || null })),
    equipamentos: equipamentos.map((e) => ({ produto_id: e.produto.id, numero_serie: e.serie || null })),
    cronograma: recorrencia !== 'nenhuma' ? cronograma : [],
  }), [clienteId, orcamentoId, tiposServico, observacoes, dataProgramada, hora, duracao, recorrencia, endereco, responsavelId, integradoId, funcionarioIds, necessitaRelatorio, outrosDocs, pragas, epis, mapaPontos, produtos, equipamentos, cronograma]);

  const validarEtapa1 = (): string | null => {
    if (!clienteId) return 'Selecione o cliente.';
    if (!tiposServico.length) return 'Selecione ao menos um tipo de serviço.';
    if (dataProgramada && isPastDate(dataProgramada)) return 'A data programada não pode estar no passado.';
    return null;
  };

  const avancar = () => {
    if (step === 1) { const err = validarEtapa1(); if (err) return showToast(err); setStep(2); }
    else if (step === 2) setStep(3);
  };
  const salvarRascunho = async () => {
    if (!clienteId) return showToast('Selecione o cliente para salvar o rascunho.');
    setSaving(true);
    try { const id = await createOrdemServico(build(true)); showToast('Rascunho salvo'); navigate(`/operacional/${id}`); }
    catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };
  const salvarOs = async () => {
    setSaving(true);
    try { const id = await createOrdemServico(build(false)); showToast('OS criada — notificações enviadas'); navigate(`/operacional/${id}`); }
    catch (e) { showToast((e as Error).message); } finally { setSaving(false); setConfirmOpen(false); }
  };

  const funcOpts = [{ value: '', label: '—' }, ...funcionarios.map((f) => ({ value: f.id, label: f.bloqueado ? `${f.nome} (doc. vencido)` : f.nome }))];

  return (
    <>
      <Topbar title="Nova ordem de serviço" breadcrumb="Início  /  Operacional  /  Nova OS" />
      <div className="flex-1 px-8 py-6">
        <button onClick={() => setCancelOpen(true)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Cancelar e voltar
        </button>

        {orcCodigo && <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-forest-50 px-3.5 py-2 text-[13px] font-medium text-forest-700"><Check className="h-4 w-4" />Criando a partir do orçamento {orcCodigo} — dados do cliente pré-preenchidos.</div>}

        <Stepper step={step} />

        <div className="mt-6 rounded-2xl border border-ink-100 bg-white px-6 py-6">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <SelectField label="Cliente" required value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                    options={[{ value: '', label: 'Selecione o cliente…' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]} />
                </div>
                <div className="flex items-end"><Button variant="secondary" className="w-full" onClick={() => showToast('Cadastrar cliente: use Gestão de Clientes (em breve inline)')}><Plus className="h-4 w-4" />Cadastrar novo cliente</Button></div>
              </div>
              {resumo && (
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-ink-50 px-4 py-3 text-[13px] md:grid-cols-3">
                  <div><span className="font-bold uppercase text-ink-400">Endereço</span><p className="text-ink-700">{resumo.endereco}</p></div>
                  <div><span className="font-bold uppercase text-ink-400">Contato</span><p className="text-ink-700">{resumo.contato}</p></div>
                  <div><span className="font-bold uppercase text-ink-400">Telefone</span><p className="text-ink-700">{resumo.telefone}</p></div>
                </div>
              )}
              <MultiCheck label="Tipos de serviço" required options={tiposCat} value={tiposServico} onChange={setTiposServico} />
              <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
                <TextField type="date" label="Data programada" value={dataProgramada} onChange={(e) => setDataProgramada(e.target.value)} error={dataProgramada && isPastDate(dataProgramada) ? 'Não pode ser no passado' : undefined} />
                <TextField type="time" label="Hora prevista" value={hora} onChange={(e) => setHora(e.target.value)} />
                <TextField label="Duração estimada" value={duracao} onChange={(e) => setDuracao(e.target.value)} placeholder="Ex.: 2h" />
                <SelectField label="Recorrência" value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as Recorrencia)}
                  options={(['nenhuma', 'semanal', 'mensal', 'trimestral'] as Recorrencia[]).map((r) => ({ value: r, label: recorrenciaLabel[r] }))} />
              </div>
              <FuncionariosPicker label="Funcionários (um ou mais)" funcionarios={funcionarios} value={funcionarioIds} onChange={setFuncionarioIds} />
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <SelectField label="Funcionário integrado / parceiro (opcional)" value={integradoId} onChange={(e) => setIntegradoId(e.target.value)} options={funcOpts} />
                <SelectField label="Responsável administrativo" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} options={funcOpts} />
              </div>
              <TextField label="Endereço de execução" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Preenchido do cliente, editável" />
              <TextareaField label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções, restrições de acesso, etc." />
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-ink-800"><input type="checkbox" className="h-4 w-4 accent-forest-600" checked={necessitaRelatorio} onChange={(e) => setNecessitaRelatorio(e.target.checked)} />Necessita relatório técnico</label>
                <TextField label="Outros documentos exigidos" value={outrosDocs} onChange={(e) => setOutrosDocs(e.target.value)} placeholder="Ex.: autorização sanitária" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-forest-50 px-4 py-3 text-[13px] md:grid-cols-4">
                <Resumo label="Cliente" value={clienteNome} />
                <Resumo label="Tipo" value={tiposServico.join(', ') || '—'} />
                <Resumo label="Data" value={dataProgramada ? dataProgramada.split('-').reverse().join('/') : '—'} />
                <Resumo label="Funcionários" value={String(funcionarioIds.length)} />
              </div>

              {/* Produtos previstos */}
              <div>
                <div className="mb-2 flex items-center justify-between"><h3 className="text-[15px] font-bold text-ink-900">Produtos previstos</h3><Button size="sm" onClick={() => setPickProd(true)}><Plus className="h-4 w-4" />Adicionar produto</Button></div>
                <div className="overflow-hidden rounded-xl border border-ink-100">
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-ink-50"><th className={THL}>Produto</th><th className={TH}>Qtd. recomendada</th><th className={TH}>Unidade</th><th className={TH}>Lote</th><th className={TH}>Prazo alvo</th><th className={cn(TH, 'text-right pr-4')} /></tr></thead>
                    <tbody>
                      {produtos.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-ink-400">Nenhum produto adicionado.</td></tr>}
                      {produtos.map((l, i) => (
                        <tr key={l.produto.id} className="border-t border-ink-100">
                          <td className="px-4 py-2.5 text-sm font-medium text-ink-800">{l.produto.name} <span className="text-ink-400">· {l.produto.cod}</span></td>
                          <td className="px-4 py-2.5"><input value={String(l.qtd)} onChange={(e) => setProdutos((arr) => arr.map((x, xi) => xi === i ? { ...x, qtd: Number(e.target.value.replace(',', '.')) || 0 } : x))} className="w-20 rounded-lg border border-ink-200 px-2 py-1 text-sm" inputMode="decimal" /></td>
                          <td className="px-4 py-2.5 text-sm text-ink-600">{l.produto.un}</td>
                          <td className="px-4 py-2.5"><input value={l.lote} onChange={(e) => setProdutos((arr) => arr.map((x, xi) => xi === i ? { ...x, lote: e.target.value } : x))} className="w-24 rounded-lg border border-ink-200 px-2 py-1 text-sm" placeholder="—" /></td>
                          <td className="px-4 py-2.5"><input type="date" value={l.prazo} onChange={(e) => setProdutos((arr) => arr.map((x, xi) => xi === i ? { ...x, prazo: e.target.value } : x))} className="rounded-lg border border-ink-200 px-2 py-1 text-sm" /></td>
                          <td className="px-4 py-2.5 pr-4 text-right"><button onClick={() => setProdutos((arr) => arr.filter((_, xi) => xi !== i))} className="text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Equipamentos */}
              <div>
                <div className="mb-2 flex items-center justify-between"><h3 className="text-[15px] font-bold text-ink-900">Equipamentos</h3><Button size="sm" onClick={() => setPickEquip(true)}><Plus className="h-4 w-4" />Adicionar equipamento</Button></div>
                <div className="overflow-hidden rounded-xl border border-ink-100">
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-ink-50"><th className={THL}>Equipamento</th><th className={TH}>Nº de série</th><th className={cn(TH, 'text-right pr-4')} /></tr></thead>
                    <tbody>
                      {equipamentos.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-ink-400">Nenhum equipamento.</td></tr>}
                      {equipamentos.map((e, i) => (
                        <tr key={e.produto.id} className="border-t border-ink-100">
                          <td className="px-4 py-2.5 text-sm font-medium text-ink-800">{e.produto.name}</td>
                          <td className="px-4 py-2.5"><input value={e.serie} onChange={(ev) => setEquipamentos((arr) => arr.map((x, xi) => xi === i ? { ...x, serie: ev.target.value } : x))} className="w-40 rounded-lg border border-ink-200 px-2 py-1 text-sm" placeholder="Nº de série" /></td>
                          <td className="px-4 py-2.5 pr-4 text-right"><button onClick={() => setEquipamentos((arr) => arr.filter((_, xi) => xi !== i))} className="text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <MultiCheck label="Pragas a serem combatidas" options={pragasCat} value={pragas} onChange={setPragas} />

              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-800">EPIs obrigatórios (derivado automaticamente)</p>
                <div className="flex flex-wrap gap-2">
                  {epis.length === 0 ? <span className="text-[13px] text-ink-400">Adicione produtos para derivar os EPIs.</span>
                    : epis.map((e) => <Badge key={e} tone="info">{e}</Badge>)}
                </div>
              </div>

              {recorrencia !== 'nenhuma' && (
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-ink-800">Cronograma ({recorrenciaLabel[recorrencia]}) — próximas datas</p>
                  {cronograma.length === 0 ? <span className="text-[13px] text-ink-400">Defina a data programada para gerar o cronograma.</span> : (
                    <div className="flex flex-wrap gap-2">
                      {cronograma.map((d, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1">
                          <input type="date" value={d} onChange={(e) => setCronograma((arr) => arr.map((x, xi) => xi === i ? e.target.value : x))} className="text-sm text-ink-700 outline-none" />
                          <button onClick={() => setCronograma((arr) => arr.filter((_, xi) => xi !== i))} className="text-ink-400 hover:text-danger-bright"><X className="h-3.5 w-3.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isMonitoramento && (
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-ink-800">Mapa de pontos (croqui — serviços de monitoramento)</p>
                  {mapaPontos
                    ? <div className="inline-flex items-center gap-2 rounded-lg bg-forest-50 px-3 py-2 text-[13px] text-forest-700"><Check className="h-4 w-4" />Croqui anexado <button onClick={() => setMapaPontos(null)} className="text-ink-400 hover:text-danger-bright"><X className="h-3.5 w-3.5" /></button></div>
                    : <Button variant="secondary" size="sm" onClick={() => { setMapaPontos('seed/mapa-pontos.pdf'); showToast('Croqui anexado (upload real em breve)'); }}><Upload className="h-4 w-4" />Enviar croqui (PDF/imagem)</Button>}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-[15px] font-bold text-ink-900">Revisão e conclusão</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3">
                <Resumo label="Cliente" value={clienteNome} />
                <Resumo label="Tipos de serviço" value={tiposServico.join(', ') || '—'} />
                <Resumo label="Recorrência" value={recorrenciaLabel[recorrencia]} />
                <Resumo label="Data / hora" value={`${dataProgramada ? dataProgramada.split('-').reverse().join('/') : '—'} ${hora}`} />
                <Resumo label="Funcionários" value={String(funcionarioIds.length)} />
                <Resumo label="Produtos previstos" value={String(produtos.length)} />
                <Resumo label="Equipamentos" value={String(equipamentos.length)} />
                <Resumo label="Pragas" value={pragas.join(', ') || '—'} />
                <Resumo label="EPIs" value={epis.join(', ') || '—'} />
                <Resumo label="Endereço" value={endereco || '—'} span />
              </div>
              <p className="text-[13px] text-ink-400">Ao salvar, a OS entra como "Em aberto", os funcionários vinculados são notificados no app e o estoque só é baixado com o consumo real registrado em campo.</p>
            </div>
          )}
        </div>

        {/* Rodapé de ações */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>{step > 1 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>Voltar</Button>}</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={salvarRascunho} disabled={saving}><Save className="h-4 w-4" />Salvar como rascunho</Button>
            {step < 3 ? <Button onClick={avancar}>Avançar</Button> : <Button onClick={() => setConfirmOpen(true)} disabled={saving}><Check className="h-4 w-4" />Salvar OS</Button>}
          </div>
        </div>
      </div>

      {pickProd && <ProdutoPicker title="Adicionar produto do estoque" loader={listProdutoOptions} exclude={produtos.map((p) => p.produto.id)} onClose={() => setPickProd(false)} onPick={(p) => { setProdutos((arr) => [...arr, { produto: p, qtd: 1, lote: '', prazo: '' }]); setPickProd(false); }} />}
      {pickEquip && <ProdutoPicker title="Adicionar equipamento do inventário" loader={listEquipamentoOptions} exclude={equipamentos.map((e) => e.produto.id)} onClose={() => setPickEquip(false)} onPick={(p) => { setEquipamentos((arr) => [...arr, { produto: p, serie: '' }]); setPickEquip(false); }} />}

      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={() => navigate('/operacional')} title="Cancelar criação" description="Os dados preenchidos serão descartados." confirmLabel="Descartar" destructive />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={salvarOs} title="Criar ordem de serviço" description="Confirma a criação da OS e o envio das notificações aos funcionários?" confirmLabel={saving ? 'Salvando…' : 'Salvar OS'} />
    </>
  );
}

const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
const THL = cn(TH, 'pl-4');

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold', active ? 'bg-forest-500 text-white' : done ? 'bg-forest-100 text-forest-700' : 'bg-ink-100 text-ink-400')}>
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className={cn('text-[13px] font-semibold', active ? 'text-ink-900' : 'text-ink-400')}>{label}</span>
            </div>
            {n < STEPS.length && <span className={cn('h-[2px] w-10 rounded', done ? 'bg-forest-300' : 'bg-ink-100')} />}
          </div>
        );
      })}
    </div>
  );
}

function Resumo({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (<div className={cn(span && 'col-span-2 md:col-span-3')}><span className="text-[11px] font-bold uppercase text-ink-400">{label}</span><p className="text-sm text-ink-800">{value}</p></div>);
}

function MultiCheck({ label, options, value, onChange, required }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; required?: boolean }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div>
      <p className="mb-1.5 block text-[13px] font-semibold text-ink-800">{label}{required && <span className="text-danger-bright"> *</span>}</p>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 && <span className="text-[13px] text-ink-400">Nenhum item no catálogo.</span>}
        {options.map((o) => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={cn('rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors', value.includes(o) ? 'border-forest-accent bg-forest-50 text-forest-700' : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function FuncionariosPicker({ label, funcionarios, value, onChange }: { label: string; funcionarios: FuncionarioOption[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string, bloqueado: boolean) => {
    if (bloqueado && !value.includes(id)) return;
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };
  return (
    <div>
      <p className="mb-1.5 block text-[13px] font-semibold text-ink-800">{label}</p>
      <div className="flex flex-wrap gap-2">
        {funcionarios.length === 0 && <span className="text-[13px] text-ink-400">Nenhum funcionário ativo.</span>}
        {funcionarios.map((f) => (
          <button key={f.id} type="button" onClick={() => toggle(f.id, f.bloqueado)} disabled={f.bloqueado && !value.includes(f.id)}
            title={f.bloqueado ? 'ASO/CNH vencido — bloqueado para novas OS' : ''}
            className={cn('rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors', value.includes(f.id) ? 'border-forest-accent bg-forest-50 text-forest-700' : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50', f.bloqueado && 'cursor-not-allowed opacity-50')}>
            {f.nome}{f.bloqueado && ' ⚠'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProdutoPicker({ title, loader, exclude, onClose, onPick }: { title: string; loader: () => Promise<Produto[]>; exclude: string[]; onClose: () => void; onPick: (p: Produto) => void }) {
  const [all, setAll] = useState<Produto[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { loader().then(setAll).catch(() => {}); }, [loader]);
  const ex = new Set(exclude);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((p) => !ex.has(p.id) && (!s || `${p.name} ${p.cod} ${p.cat}`.toLowerCase().includes(s)));
  }, [all, q, exclude]);
  return (
    <Modal open onClose={onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">{title}</h2></div>
      <div className="px-7 py-5">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, código ou categoria" />
        <div className="mt-3 max-h-[320px] overflow-y-auto rounded-xl border border-ink-100">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-400">Nenhum item disponível.</p>}
          {filtered.map((p) => (
            <button key={p.id} onClick={() => onPick(p)} className="flex w-full items-center justify-between gap-3 border-b border-ink-50 px-4 py-2.5 text-left last:border-0 hover:bg-forest-50">
              <span className="text-sm text-ink-800">{p.name} <span className="text-ink-400">· {p.cod} · {p.cat}</span></span>
              <span className="whitespace-nowrap text-[12px] text-ink-500">estoque: {p.stock} {p.un}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-ink-100 px-7 py-4"><Button variant="secondary" onClick={onClose} className="h-[46px]">Fechar</Button></div>
    </Modal>
  );
}
