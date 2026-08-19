import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Lock, Link2, Copy, Ban, Plus, Trash2 } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { listCatalogoAtivos } from '@/lib/configuracoes';
import {
  getGarantia, mudarStatusGarantia, listHistoricoGarantia, listServicosGarantia,
  addServicoGarantia, removeServicoGarantia, listLinksGarantia, gerarLinkGarantia, revogarLink,
  garantiaTone, GARANTIA_STATUS, GARANTIA_EXIGE_COMENTARIO, isGarantiaReadOnly, podeGerarLink,
  type GarantiaRow, type HistoricoGarantia, type LinkGarantia,
} from '@/lib/comercial';

const abcClasse: Record<string, string> = {
  A: 'bg-forest-100 text-forest-900',
  B: 'bg-tag-softWarnBg text-tag-warnFg',
  C: 'bg-ink-100 text-ink-500',
};

/** Tela 5.2.1 - Detalhes da garantia. */
export function GarantiaDetalhe() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canEdit = can('comercial', 'editar');

  const [g, setG] = useState<GarantiaRow | null>(null);
  const [servicos, setServicos] = useState<{ id: string; tipo: string; observacao: string }[]>([]);
  const [historico, setHistorico] = useState<HistoricoGarantia[]>([]);
  const [links, setLinks] = useState<LinkGarantia[]>([]);
  const [tiposServico, setTiposServico] = useState<string[]>([]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [comentario, setComentario] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [dias, setDias] = useState(30);
  const [novoServico, setNovoServico] = useState('');

  const load = useCallback(async () => {
    try {
      const [gar, srv, hist, lks] = await Promise.all([
        getGarantia(id), listServicosGarantia(id), listHistoricoGarantia(id), listLinksGarantia(id),
      ]);
      setG(gar); setServicos(srv); setHistorico(hist); setLinks(lks);
    } catch (e) { showToast((e as Error).message); }
  }, [id, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listCatalogoAtivos('tipos_servico').then(setTiposServico).catch(() => {}); }, []);

  if (!g) {
    return (
      <>
        <Topbar title="Garantia" breadcrumb="Início  /  Comercial  /  Garantias" />
        <div className="flex-1 px-8 py-6 text-sm text-ink-400">Carregando…</div>
      </>
    );
  }

  const readOnly = isGarantiaReadOnly(g.status);
  const editavel = canEdit && !readOnly;

  const salvarStatus = async () => {
    try {
      await mudarStatusGarantia(id, novoStatus, comentario);
      setStatusOpen(false); setComentario(''); showToast('Status atualizado'); load();
    } catch (e) { showToast((e as Error).message); }
  };

  const gerar = async () => {
    try {
      const l = await gerarLinkGarantia(id, g.status, dias);
      await navigator.clipboard.writeText(l.url).catch(() => {});
      setLinkOpen(false); showToast('Link gerado e copiado'); load();
    } catch (e) { showToast((e as Error).message); }
  };

  return (
    <>
      <Topbar title={g.osCodigo} breadcrumb={`Início  /  Comercial  /  Garantias  /  ${g.osCodigo}`} />
      <div className="flex-1 px-8 py-6">
        <button onClick={() => navigate('/comercial/garantias')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar
        </button>

        {/* Cabeçalho */}
        <div className="mb-5 rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[19px] font-bold text-ink-900">{g.osCodigo}</h2>
                <Badge tone={garantiaTone[g.status] ?? 'muted'}>{g.status}</Badge>
                {g.abc && <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', abcClasse[g.abc])}>Curva {g.abc}</span>}
              </div>
              <p className="mt-1 text-[13px] text-ink-500">
                Cliente:{' '}
                <Link to={`/clientes/${g.clienteId}`} className="font-semibold text-forest-700 hover:underline">{g.cliente}</Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editavel && (
                <Button variant="secondary" size="sm" onClick={() => { setNovoStatus(g.status); setStatusOpen(true); }}>
                  Alterar status
                </Button>
              )}
              {editavel && podeGerarLink(g.status) && (
                <Button size="sm" onClick={() => setLinkOpen(true)}><Link2 className="h-4 w-4" />Gerar link</Button>
              )}
            </div>
          </div>

          {readOnly && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 px-3.5 py-2 text-[13px] text-ink-500">
              <Lock className="h-4 w-4" />
              Garantia {g.status.toLowerCase()} — somente leitura.
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Campo label="Data de execução" valor={g.dataExecucao} />
            <Campo label="Data de validade" valor={g.dataValidade} />
            <Campo
              label="Dias restantes"
              valor={g.diasRestantes === null ? '—' : g.diasRestantes < 0 ? `Vencida há ${Math.abs(g.diasRestantes)} d` : `${g.diasRestantes} d`}
              destaque={g.diasRestantes !== null && g.diasRestantes <= 60}
            />
            <Campo label="Contato de renovação" valor={g.dataContato} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Tipos de serviço — seção fixa, nunca some sozinha (nota 7) */}
          <Card titulo="Tipos de serviço">
            {servicos.length === 0 && <Vazio>Nenhum serviço vinculado a esta garantia.</Vazio>}
            {servicos.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-t border-ink-100 px-1 py-2.5 first:border-t-0">
                <span className="text-sm text-ink-800">{s.tipo}</span>
                {editavel && (
                  <button
                    onClick={() => removeServicoGarantia(s.id).then(load).catch((e) => showToast((e as Error).message))}
                    aria-label={`Remover ${s.tipo}`}
                    className="text-ink-400 hover:text-danger-bright"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {editavel && (
              <div className="mt-3 flex gap-2">
                <SelectField
                  className="flex-1" value={novoServico} onChange={(e) => setNovoServico(e.target.value)}
                  options={[{ value: '', label: 'Selecione um serviço…' }, ...tiposServico.map((t) => ({ value: t, label: t }))]}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!novoServico) return showToast('Selecione o serviço.');
                    addServicoGarantia(id, novoServico).then(() => { setNovoServico(''); load(); }).catch((e) => showToast((e as Error).message));
                  }}
                >
                  <Plus className="h-4 w-4" />Adicionar
                </Button>
              </div>
            )}
          </Card>

          {/* Links públicos */}
          <Card titulo="Link público de renovação">
            {links.length === 0 && <Vazio>Nenhum link gerado.</Vazio>}
            {links.map((l) => (
              <div key={l.id} className="border-t border-ink-100 py-3 first:border-t-0">
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-ink-50 px-2 py-1 text-[12px] text-ink-600">{l.url}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(l.url).then(() => showToast('Link copiado'))}
                    aria-label="Copiar link" className="shrink-0 text-ink-400 hover:text-ink-900"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {editavel && !l.revogado && (
                    <button
                      onClick={() => revogarLink(l.id).then(load).catch((e) => showToast((e as Error).message))}
                      aria-label="Revogar link" className="shrink-0 text-ink-400 hover:text-danger-bright"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-ink-500">
                  {l.revogado ? 'Revogado · ' : ''}Expira em {l.expiraEm} · Aberto: {l.abertoEm} · Resposta: {l.resposta}
                </p>
              </div>
            ))}
          </Card>
        </div>

        {/* Linha do tempo */}
        <div className="mt-5">
          <Card titulo="Linha do tempo">
            {historico.length === 0 && <Vazio>Nenhuma alteração registrada.</Vazio>}
            {historico.map((h) => (
              <div key={h.id} className="border-t border-ink-100 py-3 first:border-t-0">
                <p className="text-sm text-ink-800">
                  <span className="font-semibold">{h.campo}</span>: {h.anterior} → <span className="font-semibold">{h.novo}</span>
                </p>
                {h.comentario && <p className="mt-0.5 text-[13px] text-ink-500">{h.comentario}</p>}
                <p className="mt-0.5 text-[12px] text-ink-400">{h.quando}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {statusOpen && (
        <Modal open onClose={() => setStatusOpen(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]">
            <h2 className="text-[19px] font-bold text-ink-900">Alterar status da garantia</h2>
          </div>
          <div className="flex flex-col gap-4 px-7 py-6">
            <SelectField
              label="Novo status" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}
              options={GARANTIA_STATUS.map((s) => ({ value: s, label: s }))}
            />
            <TextareaField
              label={GARANTIA_EXIGE_COMENTARIO.includes(novoStatus) ? 'Motivo (obrigatório)' : 'Comentário'}
              required={GARANTIA_EXIGE_COMENTARIO.includes(novoStatus)}
              rows={4} value={comentario} onChange={(e) => setComentario(e.target.value)}
              placeholder={GARANTIA_EXIGE_COMENTARIO.includes(novoStatus)
                ? 'Explique por que a garantia está sendo encerrada assim.'
                : 'Opcional — fica na linha do tempo.'}
            />
            {(novoStatus === 'Renovado' || novoStatus === 'Não Aplicável') && (
              <p className="rounded-lg bg-tag-softWarnBg px-3.5 py-2.5 text-[13px] text-tag-warnFg">
                Depois desta mudança a garantia fica somente leitura.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancelar</Button>
            <Button onClick={salvarStatus}>Salvar</Button>
          </div>
        </Modal>
      )}

      {linkOpen && (
        <Modal open onClose={() => setLinkOpen(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]">
            <h2 className="text-[19px] font-bold text-ink-900">Gerar link público</h2>
          </div>
          <div className="flex flex-col gap-3 px-7 py-6">
            <p className="text-[13px] text-ink-500">
              O cliente acessa sem login. O endereço leva um código único, e o link deixa de valer na data de expiração.
            </p>
            <TextField
              label="Validade (dias)" type="number" min={1} max={90} value={String(dias)}
              onChange={(e) => setDias(Number(e.target.value))}
            />
            <p className="text-[12px] text-ink-400">Padrão de 30 dias, máximo de 90.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button onClick={gerar}>Gerar e copiar</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Campo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase text-ink-400">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold', destaque ? 'text-tag-warnFg' : 'text-ink-800')}>{valor}</p>
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-6 py-5">
      <h3 className="mb-2 text-[15px] font-bold text-ink-900">{titulo}</h3>
      {children}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-[13px] text-ink-400">{children}</p>;
}
