import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { listCatalogoAtivos } from '@/lib/configuracoes';
import { listGestores } from '@/lib/funcionarios';
import {
  getOrcamento, salvarOrcamento, montarGrade, brl,
  orcStatusLabel, orcStatusTone,
  type OrcamentoDetalhe, type ItemOrcamento, type OrcStatus,
} from '@/lib/orcamentos';

const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
const STATUS: OrcStatus[] = ['em_elaboracao', 'aprovado', 'cancelado'];

/** Tela 3.1.1 - Elaborar orçamento. */
export function ElaborarOrcamento() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const podeEditar = can('gestao_clientes', 'editar');

  const [orc, setOrc] = useState<OrcamentoDetalhe | null>(null);
  const [frequencias, setFrequencias] = useState<string[]>([]);
  const [gestores, setGestores] = useState<{ id: string; nome: string }[]>([]);
  const [grade, setGrade] = useState<ItemOrcamento[]>([]);
  const [cab, setCab] = useState({ data: '', status: 'em_elaboracao' as OrcStatus, observacao: '', gestorId: '' });
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, t, f, g] = await Promise.all([
        getOrcamento(id),
        listCatalogoAtivos('tipos_controle'),
        listCatalogoAtivos('frequencias'),
        listGestores(),
      ]);
      if (!o) { showToast('Orçamento não encontrado.'); navigate('/clientes'); return; }
      setOrc(o); setFrequencias(f); setGestores(g);
      setCab({ data: o.data, status: o.status, observacao: o.observacao, gestorId: o.gestorId ?? '' });
      setGrade(montarGrade(t, o.itens, f[0] ?? 'Mensal'));
    } catch (e) { showToast((e as Error).message); }
  }, [id, navigate, showToast]);
  useEffect(() => { load(); }, [load]);

  // O total é a soma do que está marcado — recalculado enquanto a pessoa digita,
  // e não só depois de salvar, senão a grade e o total discordam na tela.
  const total = useMemo(
    () => grade.filter((i) => i.contratado).reduce((s, i) => s + (Number(i.valor) || 0), 0),
    [grade],
  );

  const up = (tipo: string, patch: Partial<ItemOrcamento>) =>
    setGrade((g) => g.map((i) => (i.tipoControle === tipo ? { ...i, ...patch } : i)));

  const salvar = async () => {
    if (salvando) return;
    const contratados = grade.filter((i) => i.contratado);
    if (cab.status === 'aprovado' && contratados.length === 0) {
      return showToast('Um orçamento aprovado precisa de ao menos um tipo de controle.');
    }
    const semValor = contratados.find((i) => !i.valor);
    if (cab.status === 'aprovado' && semValor) {
      return showToast(`Informe o valor de "${semValor.tipoControle}" antes de aprovar.`);
    }
    setSalvando(true);
    try {
      await salvarOrcamento(id, { ...cab, gestorId: cab.gestorId || null }, grade);
      showToast('Orçamento salvo');
      load();
    } catch (e) { showToast((e as Error).message); }
    finally { setSalvando(false); }
  };

  if (!orc) {
    return (<><Topbar title="Orçamento" breadcrumb="Início  /  Gestão de Clientes" /><div className="flex-1 px-8 py-6 text-sm text-ink-400">Carregando…</div></>);
  }

  return (
    <>
      <Topbar title={orc.codigo} breadcrumb={`Início  /  Gestão de Clientes  /  ${orc.cliente}  /  ${orc.codigo}`} />
      <div className="flex-1 px-8 py-6">
        <button onClick={() => navigate(`/clientes/${orc.clienteId}`)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar para o cliente
        </button>

        <div className="mb-5 rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[19px] font-bold text-ink-900">{orc.codigo}</h2>
              <Badge tone={orcStatusTone[cab.status]}>{orcStatusLabel[cab.status]}</Badge>
              {orc.osVinculadas > 0 && <Badge tone="info">{orc.osVinculadas} OS vinculada(s)</Badge>}
            </div>
            {podeEditar && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate(`/clientes/${orc.clienteId}`)}>Cancelar</Button>
                <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <TextField label="Código" value={orc.codigo} readOnly className="bg-ink-50" />
            <TextField label="Data" type="date" value={cab.data} disabled={!podeEditar}
              onChange={(e) => setCab((c) => ({ ...c, data: e.target.value }))} />
            <SelectField label="Status" value={cab.status} disabled={!podeEditar}
              onChange={(e) => setCab((c) => ({ ...c, status: e.target.value as OrcStatus }))}
              options={STATUS.map((s) => ({ value: s, label: orcStatusLabel[s] }))} />
            <SelectField label="Gestor responsável" value={cab.gestorId} disabled={!podeEditar}
              onChange={(e) => setCab((c) => ({ ...c, gestorId: e.target.value }))}
              options={[{ value: '', label: 'Sem gestor' }, ...gestores.map((g) => ({ value: g.id, label: g.nome }))]} />
            <div className="md:col-span-4">
              <TextareaField label="Observação" rows={2} value={cab.observacao} disabled={!podeEditar}
                onChange={(e) => setCab((c) => ({ ...c, observacao: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white">
          <div className="border-b border-ink-100 px-6 py-4">
            <h3 className="text-[15px] font-bold text-ink-900">Serviços e tipos de controle</h3>
            <p className="text-[13px] text-ink-500">Selecione os controles, defina a frequência e o valor por serviço.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className={cn(TH, 'pl-6')}>Tipo de controle</th>
                  <th className={TH}>Frequência</th>
                  <th className={cn(TH, 'pr-6 text-right')}>Valor / serviço</th>
                </tr>
              </thead>
              <tbody>
                {grade.map((i) => (
                  <tr key={i.tipoControle} className={cn('border-t border-ink-100', i.contratado && 'bg-forest-50/40')}>
                    <td className="px-4 py-3 pl-6">
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={i.contratado}
                          disabled={!podeEditar}
                          onChange={(e) => up(i.tipoControle, { contratado: e.target.checked })}
                          className="h-4 w-4 accent-forest-600"
                        />
                        <span className={cn('text-sm', i.contratado ? 'font-semibold text-ink-900' : 'text-ink-600')}>
                          {i.tipoControle}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <SelectField
                        value={i.frequencia}
                        disabled={!podeEditar || !i.contratado}
                        onChange={(e) => up(i.tipoControle, { frequencia: e.target.value })}
                        options={frequencias.map((f) => ({ value: f, label: f }))}
                      />
                    </td>
                    <td className="px-4 py-3 pr-6">
                      {i.contratado ? (
                        <TextField
                          type="number"
                          min={0}
                          step="0.01"
                          className="text-right"
                          value={String(i.valor)}
                          disabled={!podeEditar}
                          onChange={(e) => up(i.tipoControle, { valor: Number(e.target.value) })}
                        />
                      ) : (
                        <p className="text-right text-sm text-ink-300">—</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-200 bg-ink-50">
                  <td className="px-4 py-4 pl-6 text-sm font-bold uppercase text-ink-500" colSpan={2}>
                    Valor total do orçamento
                  </td>
                  <td className="px-4 py-4 pr-6 text-right text-[19px] font-bold text-forest-900">{brl(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {cab.status === 'aprovado' && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-forest-700">
            <Check className="h-4 w-4" />
            Orçamento aprovado — já pode gerar a ordem de serviço recorrente pela aba Orçamentos do cliente.
          </p>
        )}
      </div>
    </>
  );
}
