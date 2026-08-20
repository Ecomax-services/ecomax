import { useCallback, useEffect, useRef, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import {
  criarFollowUp, atualizarFollowUp, hojeIso, FUP_STATUS, type FollowUpRow,
} from '@/lib/comercial';
import { Anexos } from './Anexos';
import { useCatalogo } from '@/lib/useCatalogo';

const RASCUNHO = 'ecomax.fup.rascunho';
const MAX_DESC = 1000;

interface Opcao { id: string; label: string }

/** Tela 5.1.1 - Novo/Editar follow-up, em painel lateral. */
export function FollowUpDrawer({
  followUp, onClose, onSaved,
}: { followUp?: FollowUpRow; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const editando = !!followUp;

  const [clientes, setClientes] = useState<Opcao[]>([]);
  const [orcamentos, setOrcamentos] = useState<Opcao[]>([]);
  const [responsaveis, setResponsaveis] = useState<Opcao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const statusOpcoes = useCatalogo('status_follow_up', FUP_STATUS);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [proximo, setProximo] = useState(false);

  const [form, setForm] = useState({
    cliente_id: followUp?.clienteId ?? '',
    orcamento_id: followUp?.orcamentoId ?? '',
    data_registro: followUp?.dataRegistro ?? hojeIso(),
    data_acao: followUp?.dataAcao ?? hojeIso(),
    status: followUp?.status ?? 'Em espera',
    descricao: followUp?.descricao ?? '',
    responsavel_id: followUp?.responsavelId ?? '',
  });
  const inicial = useRef(JSON.stringify(form));
  const sujo = JSON.stringify(form) !== inicial.current;

  const up = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setClientes((data ?? []).map((c: any) => ({ id: c.id, label: c.nome }))));
    supabase.from('profiles').select('id, nome_completo').eq('ativo', true).order('nome_completo')
      .then(({ data }) => setResponsaveis((data ?? []).map((p: any) => ({ id: p.id, label: p.nome_completo }))));
    supabase.auth.getUser().then(({ data }) => {
      // "Responsável auto-preenchido com o usuário logado, editável."
      if (!followUp && data.user) setForm((f) => ({ ...f, responsavel_id: f.responsavel_id || data.user!.id }));
    });
  }, [followUp]);

  // Orçamentos são filtrados pelo cliente escolhido — oferecer os de outro
  // cliente convida ao erro que a tela deveria impedir.
  useEffect(() => {
    if (!form.cliente_id) { setOrcamentos([]); return; }
    supabase.from('orcamentos').select('id, codigo').eq('cliente_id', form.cliente_id).order('codigo', { ascending: false })
      .then(({ data }) => setOrcamentos((data ?? []).map((o: any) => ({ id: o.id, label: o.codigo }))));
  }, [form.cliente_id]);

  // Auto-save do rascunho a cada 10s. Só para follow-up novo: recuperar por
  // cima de um registro existente sobrescreveria dado salvo com um esboço.
  useEffect(() => {
    if (editando) return;
    const t = setInterval(() => {
      if (sujo) localStorage.setItem(RASCUNHO, JSON.stringify(form));
    }, 10_000);
    return () => clearInterval(t);
  }, [editando, form, sujo]);

  useEffect(() => {
    if (editando) return;
    const bruto = localStorage.getItem(RASCUNHO);
    if (!bruto) return;
    try {
      setForm((f) => ({ ...f, ...JSON.parse(bruto) }));
      showToast('Rascunho recuperado');
    } catch { localStorage.removeItem(RASCUNHO); }
  }, [editando, showToast]);

  const salvar = useCallback(async (eNovo = false) => {
    if (salvando) return;
    if (!form.cliente_id) return showToast('Selecione o cliente.');
    if (!form.data_acao) return showToast('Informe a data de ação.');

    setSalvando(true);
    try {
      const payload = {
        cliente_id: form.cliente_id,
        orcamento_id: form.orcamento_id || null,
        data_registro: form.data_registro,
        data_acao: form.data_acao,
        status: form.status,
        descricao: form.descricao,
        responsavel_id: form.responsavel_id || null,
      };
      if (editando) {
        await atualizarFollowUp(followUp!.id, payload);
        showToast('Follow-up atualizado');
      } else {
        await criarFollowUp(payload);
        localStorage.removeItem(RASCUNHO);
        showToast('Follow-up registrado');
      }

      // "Ao concluir um FUP → modal pergunta se deseja agendar o próximo."
      if (form.status === 'Concluído') { setProximo(true); return; }
      if (eNovo) {
        // Mantém o cliente: "Salvar e novo" serve para registrar vários
        // contatos com a mesma pessoa numa sessão só.
        setForm((f) => ({ ...f, orcamento_id: '', descricao: '', status: 'Em espera', data_acao: hojeIso() }));
        inicial.current = '';
        return;
      }
      onSaved();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }, [editando, followUp, form, onSaved, salvando, showToast]);

  const restante = MAX_DESC - form.descricao.length;

  return (
    <>
      <Drawer
        open
        onClose={() => (sujo ? setConfirmarSaida(true) : onClose())}
        title={editando ? 'Editar follow-up' : 'Novo follow-up'}
        subtitle={editando ? followUp!.cliente : 'Registre o próximo contato com o cliente'}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => (sujo ? setConfirmarSaida(true) : onClose())}>Cancelar</Button>
            {!editando && <Button variant="secondary" onClick={() => salvar(true)} disabled={salvando}>Salvar e novo</Button>}
            <Button onClick={() => salvar(false)} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectField
            label="Cliente" required value={form.cliente_id}
            onChange={(e) => { up('cliente_id', e.target.value); up('orcamento_id', ''); }}
            options={[{ value: '', label: 'Selecione…' }, ...clientes.map((c) => ({ value: c.id, label: c.label }))]}
          />
          <SelectField
            label="Orçamento" value={form.orcamento_id}
            onChange={(e) => up('orcamento_id', e.target.value)}
            options={[
              { value: '', label: form.cliente_id ? 'Sem orçamento vinculado' : 'Selecione o cliente primeiro' },
              ...orcamentos.map((o) => ({ value: o.id, label: o.label })),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Data de registro" type="date" value={form.data_registro}
              onChange={(e) => up('data_registro', e.target.value)}
            />
            <TextField
              label="Data de ação" required type="date" value={form.data_acao}
              min={editando ? undefined : hojeIso()}
              onChange={(e) => up('data_acao', e.target.value)}
            />
          </div>
          <SelectField
            label="Status" value={form.status} onChange={(e) => up('status', e.target.value)}
            options={statusOpcoes.map((s) => ({ value: s, label: s }))}
          />
          <div>
            <TextareaField
              label="Descrição" rows={5} value={form.descricao}
              maxLength={MAX_DESC}
              onChange={(e) => up('descricao', e.target.value)}
              placeholder="O que foi combinado, o que falta, quando retornar…"
            />
            <p className={`mt-1 text-right text-xs ${restante < 60 ? 'text-danger-bright' : 'text-ink-400'}`}>
              {restante} caracteres restantes
            </p>
          </div>
          <SelectField
            label="Responsável" value={form.responsavel_id}
            onChange={(e) => up('responsavel_id', e.target.value)}
            options={[{ value: '', label: 'Sem responsável' }, ...responsaveis.map((r) => ({ value: r.id, label: r.label }))]}
          />
          {form.status === 'Concluído' && !form.descricao.trim() && (
            <p className="rounded-lg bg-[#fff4f0] px-3.5 py-2.5 text-[13px] text-danger">
              Descreva o que foi feito antes de concluir.
            </p>
          )}

          {/* Anexar exige um follow-up já salvo: o arquivo é guardado sob o id
              dele, e não existe id antes de gravar. */}
          {editando ? (
            <div className="border-t border-ink-100 pt-4">
              <Anexos escopo="follow-up" id={followUp!.id} />
            </div>
          ) : (
            <p className="border-t border-ink-100 pt-4 text-[13px] text-ink-400">
              Salve o follow-up para poder anexar arquivos.
            </p>
          )}
        </div>
      </Drawer>

      {confirmarSaida && (
        <ConfirmDialog
          open
          title="Descartar alterações?"
          description="As alterações deste follow-up ainda não foram salvas."
          confirmLabel="Descartar"
          destructive
          onClose={() => setConfirmarSaida(false)}
          onConfirm={() => { setConfirmarSaida(false); onClose(); }}
        />
      )}

      {proximo && (
        <ConfirmDialog
          open
          title="Agendar o próximo follow-up?"
          description={`O follow-up foi concluído. Quer já registrar o próximo contato com ${clientes.find((c) => c.id === form.cliente_id)?.label ?? 'este cliente'}?`}
          confirmLabel="Agendar próximo"
          cancelLabel="Agora não"
          onClose={() => { setProximo(false); onSaved(); }}
          onConfirm={() => {
            setProximo(false);
            setForm((f) => ({ ...f, status: 'Em espera', descricao: '', data_registro: hojeIso(), data_acao: hojeIso() }));
            inicial.current = '';
          }}
        />
      )}
    </>
  );
}
