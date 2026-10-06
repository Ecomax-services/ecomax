import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Power, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { NOME_SERVICO, type ServicoCodigo } from '@/lib/monitoramento';
import {
  SERVICOS_COM_PONTO, listAreas, listPontosCliente, criarArea, definirAtivoArea, excluirArea,
  criarPonto, renomearPonto, definirAtivoPonto, proximoNumero, rotuloPonto,
  type AreaCliente, type PontoCliente,
} from '@/lib/mapaPontos';

/**
 * Aba "Mapa de pontos" do detalhe do cliente.
 *
 * O protótipo aprovado do Backoffice não desenha esta tela — só o envio do
 * croqui na OS. Ela existe porque o App aprovado percorre pontos fixos por
 * área e serviço, e o relatório compara o mesmo ponto visita a visita; sem um
 * lugar para cadastrar o mapa, isso só existiria por SQL. Segue o padrão das
 * outras abas daqui, sem elemento visual novo.
 */
export function MapaPontosTab({ clienteId, canEdit }: { clienteId: string; canEdit: boolean }) {
  const { showToast } = useToast();
  const [areas, setAreas] = useState<AreaCliente[]>([]);
  const [pontos, setPontos] = useState<PontoCliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroArea, setFiltroArea] = useState('todas');
  const [filtroServico, setFiltroServico] = useState('todos');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [novaArea, setNovaArea] = useState(false);
  const [novoPonto, setNovoPonto] = useState(false);
  const [renomear, setRenomear] = useState<PontoCliente | null>(null);
  const [excluir, setExcluir] = useState<AreaCliente | null>(null);

  const load = useCallback(async () => {
    setCarregando(true);
    try {
      const [a, p] = await Promise.all([listAreas(clienteId), listPontosCliente(clienteId)]);
      setAreas(a);
      setPontos(p);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [clienteId, showToast]);
  useEffect(() => { load(); }, [load]);

  const visiveis = useMemo(() => pontos.filter((p) =>
    (filtroArea === 'todas' || p.areaId === filtroArea)
    && (filtroServico === 'todos' || p.servico === filtroServico)
    && (mostrarInativos || p.ativo),
  ), [pontos, filtroArea, filtroServico, mostrarInativos]);

  const acao = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); showToast(ok); await load(); } catch (e) { showToast((e as Error).message); }
  };

  const areasAtivas = areas.filter((a) => a.ativo);
  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <div className="flex flex-col gap-4">
      {/* Áreas */}
      <div className="rounded-2xl border border-ink-100 bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-ink-900">Áreas</h3>
            <p className="mt-0.5 text-[13px] text-ink-500">
              Agrupam os pontos no App e no relatório (ex.: Fábrica, CD). A OS copia o mapa na emissão.
            </p>
          </div>
          {canEdit && <Button size="sm" variant="secondary" onClick={() => setNovaArea(true)}><Plus className="h-4 w-4" />Nova área</Button>}
        </div>

        {!carregando && areas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-[13px] text-ink-400">
            Cadastre a primeira área para começar o mapa deste cliente.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {areas.map((a) => (
              <span key={a.id}
                className={cn('inline-flex items-center gap-2 rounded-xl border px-3 py-2',
                  a.ativo ? 'border-ink-200 bg-white' : 'border-ink-100 bg-ink-50')}>
                <span className={cn('text-sm font-semibold', a.ativo ? 'text-ink-900' : 'text-ink-400')}>{a.nome}</span>
                <span className="text-[12px] text-ink-500">{a.pontos} {a.pontos === 1 ? 'ponto' : 'pontos'}</span>
                {!a.ativo && <Badge tone="muted">Inativa</Badge>}
                {canEdit && (
                  <>
                    <button title={a.ativo ? 'Inativar área' : 'Reativar área'}
                      onClick={() => acao(() => definirAtivoArea(a.id, !a.ativo), a.ativo ? 'Área inativada' : 'Área reativada')}
                      className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-forest-600">
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    {a.pontos === 0 && (
                      <button title="Excluir área" onClick={() => setExcluir(a)}
                        className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-danger-bright">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pontos */}
      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SelectField value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}
              options={[{ value: 'todas', label: 'Todas as áreas' }, ...areas.map((a) => ({ value: a.id, label: a.nome }))]} />
            <SelectField value={filtroServico} onChange={(e) => setFiltroServico(e.target.value)}
              options={[{ value: 'todos', label: 'Todos os serviços' }, ...SERVICOS_COM_PONTO.map((s) => ({ value: s, label: NOME_SERVICO[s] }))]} />
            <SelectField value={mostrarInativos ? 'todos' : 'ativos'} onChange={(e) => setMostrarInativos(e.target.value === 'todos')}
              options={[{ value: 'ativos', label: 'Só ativos' }, { value: 'todos', label: 'Ativos e inativos' }]} />
          </div>
          {canEdit && (
            <Button size="sm" disabled={areasAtivas.length === 0} onClick={() => setNovoPonto(true)}
              title={areasAtivas.length === 0 ? 'Cadastre uma área antes' : undefined}>
              <Plus className="h-4 w-4" />Novo ponto
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(th, 'pl-6')}>Ponto</th>
                <th className={th}>Serviço</th>
                <th className={th}>Área</th>
                <th className={th}>Local</th>
                <th className={cn(th, 'text-center')}>Situação</th>
                <th className={cn(th, 'pr-6 text-right')}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-400">Carregando…</td></tr>}
              {!carregando && visiveis.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-400">
                  {pontos.length === 0 ? 'Nenhum ponto cadastrado para este cliente.' : 'Nenhum ponto com esses filtros.'}
                </td></tr>
              )}
              {visiveis.map((p) => (
                <tr key={p.id} className="border-t border-ink-100">
                  <td className="px-4 py-3 pl-6">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                      <MapPin className="h-3.5 w-3.5 text-ink-400" />{rotuloPonto(p)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-600">{p.servicoNome}</td>
                  <td className="px-4 py-3 text-sm text-ink-600">{p.area}</td>
                  <td className="px-4 py-3 text-sm text-ink-800">{p.local}</td>
                  <td className="px-4 py-3 text-center"><Badge tone={p.ativo ? 'success' : 'muted'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="px-4 py-3 pr-6 text-right">
                    {canEdit && (
                      <span className="inline-flex items-center gap-1">
                        <button title="Renomear o local" onClick={() => setRenomear(p)}
                          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-forest-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button title={p.ativo ? 'Inativar ponto' : 'Reativar ponto'}
                          onClick={() => acao(() => definirAtivoPonto(p.id, !p.ativo), p.ativo ? 'Ponto inativado' : 'Ponto reativado')}
                          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-forest-600">
                          <Power className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {novaArea && (
        <NovaAreaModal onClose={() => setNovaArea(false)}
          onSalvar={(nome) => acao(async () => { await criarArea(clienteId, nome); setNovaArea(false); }, 'Área cadastrada')} />
      )}
      {novoPonto && (
        <NovoPontoModal areas={areasAtivas} pontos={pontos}
          areaInicial={filtroArea !== 'todas' ? filtroArea : areasAtivas[0]?.id ?? ''}
          servicoInicial={filtroServico !== 'todos' ? (filtroServico as ServicoCodigo) : 'PI'}
          onClose={() => setNovoPonto(false)}
          onSalvar={async (p, outro) => {
            try {
              await criarPonto(clienteId, p);
              showToast(`${rotuloPonto(p)} cadastrado`);
              await load();
              if (!outro) setNovoPonto(false);
              return true;
            } catch (e) { showToast((e as Error).message); return false; }
          }} />
      )}
      {renomear && (
        <RenomearModal ponto={renomear} onClose={() => setRenomear(null)}
          onSalvar={(local) => acao(async () => { await renomearPonto(renomear.id, local); setRenomear(null); }, 'Local atualizado')} />
      )}
      <ConfirmDialog
        open={!!excluir}
        title="Excluir área?"
        description={excluir ? `A área "${excluir.nome}" não tem pontos e será removida do mapa.` : ''}
        confirmLabel="Excluir"
        destructive
        onClose={() => setExcluir(null)}
        onConfirm={() => { const a = excluir; setExcluir(null); if (a) acao(() => excluirArea(a.id), 'Área excluída'); }}
      />
    </div>
  );
}

function NovaAreaModal({ onClose, onSalvar }: { onClose: () => void; onSalvar: (nome: string) => void }) {
  const [nome, setNome] = useState('');
  return (
    <Modal open onClose={onClose} labelledBy="titulo-nova-area">
      <div className="px-7 pb-2 pt-6">
        <h2 id="titulo-nova-area" className="text-lg font-semibold text-ink-900">Nova área</h2>
        <p className="mt-1 text-[13px] text-ink-500">Um setor do cliente que agrupa pontos, como Fábrica ou CD.</p>
      </div>
      <div className="px-7 py-4">
        <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Fábrica" autoFocus />
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
        <Button fullWidth onClick={() => onSalvar(nome)}>Cadastrar</Button>
      </div>
    </Modal>
  );
}

function NovoPontoModal({
  areas, pontos, areaInicial, servicoInicial, onClose, onSalvar,
}: {
  areas: AreaCliente[];
  pontos: PontoCliente[];
  areaInicial: string;
  servicoInicial: ServicoCodigo;
  onClose: () => void;
  onSalvar: (p: { areaId: string; servico: ServicoCodigo; fase: number | null; numero: number; local: string }, outro: boolean) => Promise<boolean>;
}) {
  const [areaId, setAreaId] = useState(areaInicial);
  const [servico, setServico] = useState<ServicoCodigo>(servicoInicial);
  const [fase, setFase] = useState('');
  const [local, setLocal] = useState('');
  const faseNum = fase.trim() ? Number(fase) : null;
  const sugerido = proximoNumero(pontos, areaId, servico, faseNum);
  const [numero, setNumero] = useState(String(sugerido));
  const [numeroEditado, setNumeroEditado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Enquanto a pessoa não digitar um número, ele acompanha a sugestão.
  useEffect(() => { if (!numeroEditado) setNumero(String(sugerido)); }, [sugerido, numeroEditado]);

  const salvar = async (outro: boolean) => {
    setSalvando(true);
    const ok = await onSalvar({ areaId, servico, fase: faseNum, numero: Number(numero), local }, outro);
    setSalvando(false);
    if (ok && outro) { setLocal(''); setNumeroEditado(false); }
  };

  return (
    <Modal open onClose={onClose} labelledBy="titulo-novo-ponto">
      <div className="px-7 pb-2 pt-6">
        <h2 id="titulo-novo-ponto" className="text-lg font-semibold text-ink-900">Novo ponto</h2>
        <p className="mt-1 text-[13px] text-ink-500">Entra nas próximas OS emitidas para este cliente.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 px-7 py-4">
        <SelectField label="Área" value={areaId} onChange={(e) => setAreaId(e.target.value)}
          options={areas.map((a) => ({ value: a.id, label: a.nome }))} />
        <SelectField label="Serviço" value={servico} onChange={(e) => setServico(e.target.value as ServicoCodigo)}
          options={SERVICOS_COM_PONTO.map((s) => ({ value: s, label: NOME_SERVICO[s] }))} />
        <TextField label="Fase (opcional)" inputMode="numeric" value={fase}
          onChange={(e) => setFase(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Sem fase" />
        <TextField label="Número" inputMode="numeric" value={numero}
          onChange={(e) => { setNumeroEditado(true); setNumero(e.target.value.replace(/\D/g, '').slice(0, 4)); }} />
        <div className="col-span-2">
          <TextField label="Local" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Doca 3" />
        </div>
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose}>Fechar</Button>
        <Button variant="secondary" fullWidth disabled={salvando} onClick={() => salvar(true)}>Cadastrar e adicionar outro</Button>
        <Button fullWidth disabled={salvando} onClick={() => salvar(false)}>Cadastrar</Button>
      </div>
    </Modal>
  );
}

function RenomearModal({ ponto, onClose, onSalvar }: { ponto: PontoCliente; onClose: () => void; onSalvar: (local: string) => void }) {
  const [local, setLocal] = useState(ponto.local);
  return (
    <Modal open onClose={onClose} labelledBy="titulo-renomear-ponto">
      <div className="px-7 pb-2 pt-6">
        <h2 id="titulo-renomear-ponto" className="text-lg font-semibold text-ink-900">{rotuloPonto(ponto)} · {ponto.servicoNome}</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          Só o local muda. OS já emitidas guardam o nome de quando foram emitidas.
        </p>
      </div>
      <div className="px-7 py-4">
        <TextField label="Local" value={local} onChange={(e) => setLocal(e.target.value)} autoFocus />
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
        <Button fullWidth onClick={() => onSalvar(local)}>Salvar</Button>
      </div>
    </Modal>
  );
}
