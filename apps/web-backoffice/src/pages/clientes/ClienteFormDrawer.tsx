import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { maskCPF, maskCNPJ, maskCEP, maskPhone } from '@/lib/masks';
import { getCliente, createCliente, updateCliente, type ClienteInput } from '@/lib/clientes';

const empty = {
  tipo_pessoa: 'pj' as 'pf' | 'pj', nome: '', razao_social: '', cnpj: '', cpf: '', regiao: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  email: '', telefone: '', observacoes: '',
};
type FormState = typeof empty;

/** Drawer de cadastro/edição de cliente, reusado pela Lista e pelo Detalhe. */
export function ClienteFormDrawer({
  open, clienteId, onClose, onSaved,
}: {
  open: boolean; clienteId: string | null; onClose: () => void; onSaved: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const isNew = !clienteId;

  useEffect(() => {
    if (!open) return;
    if (!clienteId) { setForm(empty); return; }
    getCliente(clienteId).then((c) => setForm({
      tipo_pessoa: c.tipo_pessoa, nome: c.nome, razao_social: c.razao_social ?? '', cnpj: c.cnpj ?? '', cpf: c.cpf ?? '',
      regiao: c.regiao === '—' ? '' : c.regiao, cep: c.cep ?? '', logradouro: c.logradouro ?? '', numero: c.numero ?? '',
      complemento: c.complemento ?? '', bairro: c.bairro ?? '', cidade: c.cidade ?? '', uf: c.uf ?? '',
      email: c.email ?? '', telefone: c.telefone ?? '', observacoes: c.observacoes ?? '',
    })).catch((e) => showToast((e as Error).message));
  }, [open, clienteId, showToast]);

  const up = (k: keyof FormState, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome do cliente.');
    if (form.tipo_pessoa === 'pj' && !form.razao_social.trim()) return showToast('Informe a razão social.');
    setSaving(true);
    try {
      const payload: ClienteInput = {
        nome: form.nome.trim(), razao_social: form.tipo_pessoa === 'pj' ? (form.razao_social.trim() || null) : null,
        tipo_pessoa: form.tipo_pessoa, cnpj: form.tipo_pessoa === 'pj' ? (form.cnpj || null) : null,
        cpf: form.tipo_pessoa === 'pf' ? (form.cpf || null) : null, regiao: form.regiao || null,
        cep: form.cep || null, logradouro: form.logradouro || null, numero: form.numero || null,
        complemento: form.complemento || null, bairro: form.bairro || null, cidade: form.cidade || null, uf: form.uf || null,
        email: form.email || null, telefone: form.telefone || null, observacoes: form.observacoes || null,
      };
      const id = isNew ? await createCliente(payload) : (await updateCliente(clienteId!, payload), clienteId!);
      showToast('Cliente salvo');
      onSaved(id);
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={560}
      title={isNew ? 'Novo cliente' : 'Editar cliente'}
      subtitle="Cadastro do cliente"
      footer={
        <>
          <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
          <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar cliente'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField label="Tipo de pessoa" value={form.tipo_pessoa} onChange={(e) => up('tipo_pessoa', e.target.value)} options={[{ value: 'pj', label: 'Pessoa Jurídica' }, { value: 'pf', label: 'Pessoa Física' }]} />
        <TextField label="Nome" required value={form.nome} onChange={(e) => up('nome', e.target.value)} placeholder={form.tipo_pessoa === 'pj' ? 'Nome fantasia' : 'Nome completo'} />
        {form.tipo_pessoa === 'pj' ? (
          <div className="grid grid-cols-2 gap-3.5">
            <TextField label="Razão social" required value={form.razao_social} onChange={(e) => up('razao_social', e.target.value)} placeholder="Razão social" />
            <TextField label="CNPJ" inputMode="numeric" value={form.cnpj} onChange={(e) => up('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
          </div>
        ) : (
          <TextField label="CPF" inputMode="numeric" value={form.cpf} onChange={(e) => up('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
        )}
        <div className="grid grid-cols-2 gap-3.5">
          <TextField label="Região da cidade" value={form.regiao} onChange={(e) => up('regiao', e.target.value)} placeholder="Ex.: Zona Sul" />
          <TextField label="Telefone" inputMode="numeric" value={form.telefone} onChange={(e) => up('telefone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
        </div>
        <TextField label="E-mail" value={form.email} onChange={(e) => up('email', e.target.value)} placeholder="contato@cliente.com" />
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Endereço</p>
        <div className="grid grid-cols-[1fr_2fr] gap-3.5">
          <TextField label="CEP" inputMode="numeric" value={form.cep} onChange={(e) => up('cep', maskCEP(e.target.value))} placeholder="00000-000" />
          <TextField label="Logradouro" value={form.logradouro} onChange={(e) => up('logradouro', e.target.value)} placeholder="Rua / Av." />
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-3.5">
          <TextField label="Número" value={form.numero} onChange={(e) => up('numero', e.target.value)} placeholder="Nº" />
          <TextField label="Complemento" value={form.complemento} onChange={(e) => up('complemento', e.target.value)} placeholder="Sala, bloco…" />
        </div>
        <div className="grid grid-cols-[2fr_2fr_1fr] gap-3.5">
          <TextField label="Bairro" value={form.bairro} onChange={(e) => up('bairro', e.target.value)} placeholder="Bairro" />
          <TextField label="Cidade" value={form.cidade} onChange={(e) => up('cidade', e.target.value)} placeholder="Cidade" />
          <TextField label="UF" value={form.uf} onChange={(e) => up('uf', e.target.value)} placeholder="SP" />
        </div>
        <TextareaField label="Observações" value={form.observacoes} onChange={(e) => up('observacoes', e.target.value)} placeholder="Notas internas" />
      </div>
    </Drawer>
  );
}
