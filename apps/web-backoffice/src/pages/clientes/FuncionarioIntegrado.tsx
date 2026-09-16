/**
 * Tela do funcionário integrado — o cadastro completo de quem a Ecomax aloca
 * num cliente, com as três dimensões que o protótipo abre em sub-abas.
 *
 * Chega-se aqui pela aba "Funcionários integrados" do detalhe do cliente. O
 * cliente do caminho importa: "Substituir funcionário" troca a pessoa nas OS
 * abertas *daquela* empresa, não em todas.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Truck, Network, ArrowLeftRight, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, SelectField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { maskPhone, maskCPF, maskCEP, maskDate, maskRG } from '@/lib/masks';
import { brParaISO } from '@/lib/datas';
import { docTone } from '@/data/usuarios';
import { getCliente } from '@/lib/clientes';
import { listGestores, listFuncionarios } from '@/lib/funcionarios';
import { listCatalogoAtivos } from '@/lib/configuracoes';
import {
  getFuncionarioIntegrado, salvarFuncionarioIntegrado, estadoDocumentos,
  listIntegracoes, integrarEmEmpresa, removerIntegracao, definirVencimentoIntegracao, listEmpresasDisponiveis,
  listServicosDoFuncionario, vincularServico, removerServico,
  substituirFuncionario,
  type FuncionarioIntegrado as Func, type IntegracaoEmpresa, type ServicoDoFuncionario,
} from '@/lib/funcionarioIntegrado';

const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';

type SubAba = 'empresas' | 'servicos' | 'mec';
const SUB_ABAS: { key: SubAba; label: string }[] = [
  { key: 'empresas', label: 'Integração com Empresas' },
  { key: 'servicos', label: 'Serviços do Funcionário' },
  { key: 'mec', label: 'Linhas MEC' },
];

const situacaoTone = {
  'Em dia': 'success', 'A vencer': 'warn', 'Vencida': 'danger', 'Sem prazo': 'muted',
} as const;

const vazio = {
  nome_completo: '', cargo: '', setor: '', gestor_id: '', telefone: '', rg: '', cpf: '', cep: '',
  aso: '', cnh: '', cnh_numero: '', cnh_categoria: '', utiliza_caixa: false, ativo: true,
};

export function FuncionarioIntegrado() {
  const { clienteId, funcionarioId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const podeEditar = can('gestao_clientes', 'editar');

  const [func, setFunc] = useState<Func | null>(null);
  const [empresa, setEmpresa] = useState('');
  const [form, setForm] = useState(vazio);
  const [gestores, setGestores] = useState<{ id: string; nome: string }[]>([]);
  const [aba, setAba] = useState<SubAba>('empresas');
  const [salvando, setSalvando] = useState(false);
  const [substituirOpen, setSubstituirOpen] = useState(false);

  const carregar = useCallback(async () => {
    if (!funcionarioId) return;
    try {
      const f = await getFuncionarioIntegrado(funcionarioId);
      setFunc(f);
      setForm({
        nome_completo: f.nome_completo, cargo: f.cargo ?? '', setor: f.setor ?? '',
        gestor_id: f.gestor_id ?? '', telefone: f.telefone ?? '', rg: f.rg ?? '', cpf: f.cpf ?? '',
        cep: f.cep ?? '',
        aso: f.aso_validade ? f.aso_validade.split('-').reverse().join('/') : '',
        cnh: f.cnh_validade ? f.cnh_validade.split('-').reverse().join('/') : '',
        cnh_numero: f.cnh_numero ?? '', cnh_categoria: f.cnh_categoria ?? '',
        utiliza_caixa: f.utiliza_caixa, ativo: f.ativo,
      });
    } catch (e) { showToast((e as Error).message); }
  }, [funcionarioId, showToast]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { listGestores().then(setGestores).catch(() => {}); }, []);
  useEffect(() => {
    if (clienteId) getCliente(clienteId).then((c) => setEmpresa(c.nome)).catch(() => {});
  }, [clienteId]);

  const up = (k: keyof typeof form, v: string | boolean) => setForm((s) => ({ ...s, [k]: v }));

  const salvar = async () => {
    if (!funcionarioId) return;
    if (!form.nome_completo.trim()) return showToast('Informe o nome do funcionário.');
    // Data digitada vira ISO aqui, e não no banco: `brParaISO` recusa 31/02 e
    // devolve null, que é o que separa "campo vazio" de "data impossível".
    const asoIso = form.aso.trim() ? brParaISO(form.aso) : null;
    const cnhIso = form.cnh.trim() ? brParaISO(form.cnh) : null;
    if (form.aso.trim() && !asoIso) return showToast('Vencimento do ASO inválido (dd/mm/aaaa).');
    if (form.cnh.trim() && !cnhIso) return showToast('Vencimento da CNH inválido (dd/mm/aaaa).');

    setSalvando(true);
    try {
      await salvarFuncionarioIntegrado(funcionarioId, {
        nome_completo: form.nome_completo.trim(), cargo: form.cargo.trim(), setor: form.setor.trim(),
        gestor_id: form.gestor_id || null, telefone: form.telefone || null, rg: form.rg || null,
        cpf: form.cpf, cep: form.cep || null,
        aso_validade: asoIso, cnh_validade: cnhIso,
        cnh_numero: form.cnh_numero || null, cnh_categoria: form.cnh_categoria || null,
        utiliza_caixa: form.utiliza_caixa, ativo: form.ativo,
      });
      showToast('Funcionário salvo');
      await carregar();
    } catch (e) { showToast((e as Error).message); } finally { setSalvando(false); }
  };

  const voltar = () => navigate(clienteId ? `/clientes/${clienteId}` : '/clientes');
  const docs = func ? estadoDocumentos(func) : null;

  return (
    <>
      <Topbar
        title={func?.nome_completo ?? 'Funcionário integrado'}
        breadcrumb={`Início  /  Gestão de Clientes  /  ${empresa || '…'}  /  Funcionário integrado`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={voltar}>Cancelar</Button>
            {podeEditar && <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>}
          </div>
        }
      />

      <div className="flex-1 px-8 py-6">
        {/* Toolbar de três ações, como no protótipo. */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant="secondary" size="sm"
            onClick={() => navigate(`/estoque/inventario?operador=${funcionarioId}`)}
          >
            <Truck className="h-4 w-4" />Consumo de Funcionário
          </Button>
          {/* MEC EF nasce da integração com o Omie, escopo da Release 4. Fica
              desabilitado dizendo por quê, e não um botão que parece funcionar
              e devolve um aviso — é o mesmo tratamento de "Criar MEC EPF" na
              lista de clientes. */}
          <Button variant="secondary" size="sm" disabled title="Integração com o Omie — Release 4">
            <Network className="h-4 w-4" />Criar MEC EF · Release 4
          </Button>
          {podeEditar && (
            <Button variant="secondary" size="sm" onClick={() => setSubstituirOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" />Substituir Funcionário
            </Button>
          )}
        </div>

        <div className="mb-5 rounded-2xl border border-ink-100 bg-white p-6">
          <div className="grid grid-cols-3 gap-3.5">
            <TextField label="Nome" required value={form.nome_completo} onChange={(e) => up('nome_completo', e.target.value)} placeholder="Nome completo" />
            <TextField label="Cargo" value={form.cargo} onChange={(e) => up('cargo', e.target.value)} placeholder="Cargo" />
            <TextField label="Setor" value={form.setor} onChange={(e) => up('setor', e.target.value)} placeholder="Setor" />
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-3.5">
            <div>
              <TextField label="Vecto ASO" value={form.aso} onChange={(e) => up('aso', maskDate(e.target.value))} placeholder="dd/mm/aaaa" />
              {docs && <p className="mt-1.5"><Badge tone={docTone[docs.aso]}>{docs.asoLabel}</Badge></p>}
            </div>
            <div>
              <TextField label="Vecto CNH" value={form.cnh} onChange={(e) => up('cnh', maskDate(e.target.value))} placeholder="dd/mm/aaaa" />
              {docs && <p className="mt-1.5"><Badge tone={docTone[docs.cnh]}>{docs.cnhLabel}</Badge></p>}
            </div>
            <SelectField
              label="Gestor" value={form.gestor_id} onChange={(e) => up('gestor_id', e.target.value)}
              options={[{ value: '', label: 'Sem gestor' }, ...gestores.map((g) => ({ value: g.id, label: g.nome }))]}
            />
          </div>

          <div className="mt-3.5 grid grid-cols-4 gap-3.5">
            <TextField label="Telefone" value={form.telefone} onChange={(e) => up('telefone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            <TextField label="RG" value={form.rg} onChange={(e) => up('rg', maskRG(e.target.value))} placeholder="RG" />
            <TextField label="CPF" value={form.cpf} onChange={(e) => up('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
            <TextField label="CEP" value={form.cep} onChange={(e) => up('cep', maskCEP(e.target.value))} placeholder="00000-000" />
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3.5">
            <TextField label="CNH Número" value={form.cnh_numero} onChange={(e) => up('cnh_numero', e.target.value)} placeholder="Número da CNH" />
            <TextField label="CNH Categoria" value={form.cnh_categoria} onChange={(e) => up('cnh_categoria', e.target.value.toUpperCase().slice(0, 3))} placeholder="AB" />
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
              <input type="checkbox" checked={form.utiliza_caixa} onChange={(e) => up('utiliza_caixa', e.target.checked)} className="h-4 w-4 accent-forest-600" />
              Utiliza Caixa
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
              <input type="checkbox" checked={form.ativo} onChange={(e) => up('ativo', e.target.checked)} className="h-4 w-4 accent-forest-600" />
              Ativo
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white">
          <div className="border-b border-ink-100 px-6 pt-4">
            <Tabs tabs={SUB_ABAS} value={aba} onChange={setAba} />
          </div>
          {funcionarioId && aba === 'empresas' && <AbaEmpresas funcionarioId={funcionarioId} podeEditar={podeEditar} />}
          {funcionarioId && aba === 'servicos' && <AbaServicos funcionarioId={funcionarioId} podeEditar={podeEditar} />}
          {aba === 'mec' && <AbaMec />}
        </div>
      </div>

      {substituirOpen && clienteId && funcionarioId && (
        <ModalSubstituir
          clienteId={clienteId} deId={funcionarioId} empresa={empresa}
          onClose={() => setSubstituirOpen(false)}
          onPronto={() => { setSubstituirOpen(false); voltar(); }}
        />
      )}
    </>
  );
}

// ============================================================
// Integração com Empresas
// ============================================================
function AbaEmpresas({ funcionarioId, podeEditar }: { funcionarioId: string; podeEditar: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<IntegracaoEmpresa[]>([]);
  const [novoOpen, setNovoOpen] = useState(false);
  const [opcoes, setOpcoes] = useState<{ id: string; nome: string }[]>([]);
  const [sel, setSel] = useState('');
  const [venc, setVenc] = useState('');
  const [del, setDel] = useState<IntegracaoEmpresa | null>(null);

  const load = useCallback(() => {
    listIntegracoes(funcionarioId).then(setRows).catch((e) => showToast((e as Error).message));
  }, [funcionarioId, showToast]);
  useEffect(() => { load(); }, [load]);

  const abrirNovo = async () => {
    setSel(''); setVenc('');
    setOpcoes(await listEmpresasDisponiveis(funcionarioId));
    setNovoOpen(true);
  };

  const integrar = async () => {
    if (!sel) return showToast('Escolha a empresa.');
    const iso = venc.trim() ? brParaISO(venc) : null;
    if (venc.trim() && !iso) return showToast('Vencimento inválido (dd/mm/aaaa).');
    try { await integrarEmEmpresa(funcionarioId, sel, iso); setNovoOpen(false); showToast('Integração criada'); load(); }
    catch (e) { showToast((e as Error).message); }
  };

  const gravarVenc = async (r: IntegracaoEmpresa, texto: string) => {
    const iso = texto.trim() ? brParaISO(texto) : null;
    if (texto.trim() && !iso) { showToast('Vencimento inválido (dd/mm/aaaa).'); load(); return; }
    if (iso === r.vencimentoIso) return;
    try { await definirVencimentoIntegracao(r.vinculoId, iso); load(); }
    catch (e) { showToast((e as Error).message); load(); }
  };

  return (
    <>
      <div className="flex justify-end px-6 py-3">
        {podeEditar && <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" />Nova integração</Button>}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-ink-50">
            <th className={cn(TH, 'pl-6')}>Empresa</th>
            <th className={TH}>Vencimento</th>
            <th className={cn(TH, 'text-center')}>Dias p/ vencer</th>
            <th className={cn(TH, 'text-center')}>Situação</th>
            <th className={cn(TH, 'pr-6 text-right')}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">Este funcionário não está integrado a nenhuma empresa.</td></tr>}
          {rows.map((r) => (
            <tr key={r.vinculoId} className="border-t border-ink-100">
              <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">{r.empresa}</td>
              <td className="px-4 py-3">
                <input
                  defaultValue={r.vencimento === '—' ? '' : r.vencimento}
                  key={`${r.vinculoId}-${r.vencimentoIso}`}
                  disabled={!podeEditar}
                  placeholder="dd/mm/aaaa"
                  onChange={(e) => { e.target.value = maskDate(e.target.value); }}
                  onBlur={(e) => gravarVenc(r, e.target.value)}
                  className="w-[118px] rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm text-ink-800 outline-none focus:border-forest-accent disabled:bg-ink-50"
                />
              </td>
              <td className="px-4 py-3 text-center text-sm">
                {r.diasParaVencer === null ? <span className="text-ink-300">—</span>
                  : r.diasParaVencer < 0 ? <span className="font-semibold text-danger-bright">{r.diasParaVencer}</span>
                  : <span className={r.diasParaVencer <= 60 ? 'font-semibold text-tag-warnFg' : 'text-ink-600'}>{r.diasParaVencer}</span>}
              </td>
              <td className="px-4 py-3 text-center"><Badge tone={situacaoTone[r.situacao]}>{r.situacao}</Badge></td>
              <td className="px-4 py-3 pr-6 text-right">
                {podeEditar
                  ? <button onClick={() => setDel(r)} aria-label={`Remover integração com ${r.empresa}`} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button>
                  : <span className="text-[13px] text-ink-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {novoOpen && (
        <Modal open onClose={() => setNovoOpen(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]">
            <h2 className="text-[19px] font-bold text-ink-900">Nova integração</h2>
            <p className="mt-1 text-[13px] text-ink-500">Vincula este funcionário a mais uma empresa.</p>
          </div>
          <div className="flex flex-col gap-4 px-7 py-6">
            <SelectField
              label="Empresa" required value={sel} onChange={(e) => setSel(e.target.value)}
              options={[{ value: '', label: opcoes.length ? 'Selecione…' : 'Já integrado a todas as empresas ativas' }, ...opcoes.map((o) => ({ value: o.id, label: o.nome }))]}
            />
            <TextField label="Vencimento da integração" value={venc} onChange={(e) => setVenc(maskDate(e.target.value))} placeholder="dd/mm/aaaa (opcional)" />
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
            <Button variant="secondary" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button onClick={integrar}>Integrar</Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          try { await removerIntegracao(del.vinculoId); setDel(null); showToast('Integração removida'); load(); }
          catch (e) { showToast((e as Error).message); }
        }}
        title={del ? `Remover integração com "${del.empresa}"` : ''}
        description="O funcionário deixa de estar integrado a esta empresa. As OS já executadas não mudam."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        destructive
      />
    </>
  );
}

// ============================================================
// Serviços do Funcionário
// ============================================================
function AbaServicos({ funcionarioId, podeEditar }: { funcionarioId: string; podeEditar: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ServicoDoFuncionario[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [novoOpen, setNovoOpen] = useState(false);
  const [form, setForm] = useState({ tipo: '', habilitacao: '', validade: '' });
  const [del, setDel] = useState<ServicoDoFuncionario | null>(null);

  const load = useCallback(() => {
    listServicosDoFuncionario(funcionarioId).then(setRows).catch((e) => showToast((e as Error).message));
  }, [funcionarioId, showToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { listCatalogoAtivos('tipos_servico').then(setTipos).catch(() => {}); }, []);

  const vincular = async () => {
    if (!form.tipo) return showToast('Escolha o tipo de serviço.');
    const iso = form.validade.trim() ? brParaISO(form.validade) : null;
    if (form.validade.trim() && !iso) return showToast('Validade inválida (dd/mm/aaaa).');
    try {
      await vincularServico(funcionarioId, form.tipo, form.habilitacao, iso);
      setNovoOpen(false); showToast('Serviço vinculado'); load();
    } catch (e) { showToast((e as Error).message); }
  };

  return (
    <>
      <div className="flex justify-end px-6 py-3">
        {podeEditar && (
          <Button size="sm" onClick={() => { setForm({ tipo: '', habilitacao: '', validade: '' }); setNovoOpen(true); }}>
            <Plus className="h-4 w-4" />Vincular serviço
          </Button>
        )}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-ink-50">
            <th className={cn(TH, 'pl-6')}>Tipo de serviço</th>
            <th className={TH}>Habilitação / Certificação</th>
            <th className={cn(TH, 'text-center')}>Validade</th>
            <th className={cn(TH, 'pr-6 text-right')}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum serviço vinculado a este funcionário.</td></tr>}
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-ink-100">
              <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">{s.tipo_servico}</td>
              <td className="px-4 py-3 text-sm text-ink-600">{s.habilitacao}</td>
              <td className="px-4 py-3 text-center">
                {/* Sem validade aqui é legítimo — treinamento interno não vence.
                    Por isso o badge "Sem validade" e não um alerta. */}
                <Badge tone={docTone[s.estado]}>{s.validade === '—' ? 'Sem validade' : s.validade}</Badge>
              </td>
              <td className="px-4 py-3 pr-6 text-right">
                {podeEditar
                  ? <button onClick={() => setDel(s)} aria-label={`Remover ${s.tipo_servico}`} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button>
                  : <span className="text-[13px] text-ink-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {novoOpen && (
        <Modal open onClose={() => setNovoOpen(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]">
            <h2 className="text-[19px] font-bold text-ink-900">Vincular serviço</h2>
            <p className="mt-1 text-[13px] text-ink-500">Para que tipo de serviço este funcionário é habilitado.</p>
          </div>
          <div className="flex flex-col gap-4 px-7 py-6">
            <SelectField
              label="Tipo de serviço" required value={form.tipo} onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}
              options={[{ value: '', label: 'Selecione…' }, ...tipos.map((t) => ({ value: t, label: t }))]}
            />
            <TextField label="Habilitação / Certificação" value={form.habilitacao} onChange={(e) => setForm((s) => ({ ...s, habilitacao: e.target.value }))} placeholder="Ex.: NR-31 · Aplicador certificado" />
            <TextField label="Validade" value={form.validade} onChange={(e) => setForm((s) => ({ ...s, validade: maskDate(e.target.value) }))} placeholder="dd/mm/aaaa (deixe vazio se não vence)" />
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
            <Button variant="secondary" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button onClick={vincular}>Vincular</Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          try { await removerServico(del.id); setDel(null); showToast('Serviço removido'); load(); }
          catch (e) { showToast((e as Error).message); }
        }}
        title={del ? `Remover "${del.tipo_servico}"` : ''}
        description="O funcionário deixa de constar como habilitado para este tipo de serviço."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        destructive
      />
    </>
  );
}

// ============================================================
// Linhas MEC
// ============================================================
function AbaMec() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <AlertTriangle className="h-6 w-6 text-tag-warnFg" />
      <p className="text-sm font-semibold text-ink-800">Linhas MEC chegam com a integração Omie</p>
      <p className="max-w-[460px] text-[13px] text-ink-400">
        A estrutura fiscal do funcionário (MEC EF) nasce do Omie, que é escopo da Release 4.
        Enquanto a integração não existe, esta aba não tem de onde tirar dado — e uma tabela
        vazia sem explicação pareceria um erro.
      </p>
    </div>
  );
}

// ============================================================
// Substituir funcionário
// ============================================================
function ModalSubstituir({
  clienteId, deId, empresa, onClose, onPronto,
}: { clienteId: string; deId: string; empresa: string; onClose: () => void; onPronto: () => void }) {
  const { showToast } = useToast();
  const [opcoes, setOpcoes] = useState<{ id: string; nome: string }[]>([]);
  const [para, setPara] = useState('');
  const [rodando, setRodando] = useState(false);

  useEffect(() => {
    listFuncionarios({ filtro: 'ativos', page: 1, pageSize: 200 })
      .then((r) => setOpcoes(r.rows.filter((u) => u.id !== deId).map((u) => ({ id: u.id, nome: u.name }))))
      .catch(() => {});
  }, [deId]);

  const aplicar = async () => {
    if (!para) return showToast('Escolha o substituto.');
    setRodando(true);
    try {
      const { trocadas } = await substituirFuncionario(clienteId, deId, para);
      showToast(trocadas === 0 ? 'Nenhuma OS aberta para trocar.' : `${trocadas} OS aberta(s) atualizada(s)`);
      onPronto();
    } catch (e) { showToast((e as Error).message); } finally { setRodando(false); }
  };

  return (
    <Modal open onClose={onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]">
        <h2 className="text-[19px] font-bold text-ink-900">Substituir funcionário</h2>
        <p className="mt-1 text-[13px] text-ink-500">Nas OS ainda abertas de {empresa || 'esta empresa'}.</p>
      </div>
      <div className="flex flex-col gap-4 px-7 py-6">
        <SelectField
          label="Substituto" required value={para} onChange={(e) => setPara(e.target.value)}
          options={[{ value: '', label: 'Selecione…' }, ...opcoes.map((o) => ({ value: o.id, label: o.nome }))]}
        />
        <p className="rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-4 py-3 text-[13px] text-tag-softWarnFg">
          OS já concluídas não mudam: elas são o registro de quem esteve no local.
          A troca vale só para o que ainda vai ser executado.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={aplicar} disabled={rodando}>{rodando ? 'Substituindo…' : 'Substituir'}</Button>
      </div>
    </Modal>
  );
}
