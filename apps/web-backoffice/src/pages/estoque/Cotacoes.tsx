import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { SelectField, SearchInput, TextField, TextareaField, FieldLabel } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { COTACAO_ROWS, COMPARATIVO, type CotacaoRow } from '@/data/estoque';

export function Cotacoes() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [drawer, setDrawer] = useState(false);
  const [resp, setResp] = useState<CotacaoRow | null>(null);

  const rows = COTACAO_ROWS.filter((c) => {
    if (!`${c.cod} ${c.prod}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== 'todos' && c.status !== status) return false;
    return true;
  });

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  const aprovar = () => {
    setResp(null);
    showToast('Cotação aprovada → requisição gerada em Requisições (pré-preenchida)');
    navigate('/estoque/requisicoes');
  };

  return (
    <>
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">cotações</span>
        </div>
        {canCreate && <Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" />Nova cotação</Button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar código ou produto" />
        <SelectField value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'todos', label: 'Todos os status' }, { value: 'Respondida', label: 'Respondida' }, { value: 'Aguardando respostas', label: 'Aguardando respostas' }, { value: 'Aprovada', label: 'Aprovada' }]} />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className={cn(th, 'pl-6')}>Código</th>
              <th className={th}>Produto</th>
              <th className={th}>Qtd</th>
              <th className={th}>Fornecedores</th>
              <th className={th}>Data</th>
              <th className={cn(th, 'pr-6')}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.cod} onClick={() => setResp(c)} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">{c.cod}</td>
                <td className="px-4 py-3.5 text-sm text-ink-800">{c.prod}</td>
                <td className="px-4 py-3.5 text-sm text-ink-700">{c.qtd}</td>
                <td className="px-4 py-3.5 text-sm text-ink-700">{c.forns}</td>
                <td className="px-4 py-3.5 text-sm text-ink-600">{c.date}</td>
                <td className="px-4 py-3.5 pr-6"><Badge tone={c.tone}>{c.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comparativo */}
      <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-ink-900">Comparativo — COT-0231 · Inseticida Permetrina</h3>
            <p className="mt-0.5 text-[13px] text-ink-400">Melhor oferta destacada automaticamente</p>
          </div>
          {canEdit && <Button onClick={aprovar}>Aprovar vencedora → gerar requisição</Button>}
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          {COMPARATIVO.map((c) => (
            <div key={c.forn} className={cn('relative rounded-[13px] border p-5', c.best ? 'border-forest-accent bg-primary50' : 'border-ink-100 bg-white')}>
              {c.best && <span className="absolute right-3.5 top-3.5 rounded-full bg-forest-accent px-2.5 py-0.5 text-[11px] font-bold text-white">Melhor</span>}
              <div className="mb-3.5 text-[15px] font-bold text-ink-900">{c.forn}</div>
              <Row label="Valor" value={c.valor} bold />
              <Row label="Prazo" value={c.prazo} />
              <Row label="Condição" value={c.cond} last />
            </div>
          ))}
        </div>
      </div>

      {/* Drawer: nova cotação */}
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Nova cotação"
        subtitle="Solicitar preços a fornecedores"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={() => { setDrawer(false); showToast('Cotação criada e enviada aos fornecedores'); }} className="h-[52px]">Criar e enviar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[2fr_1fr] gap-3.5">
            <SelectField label="Produto" required><option>Inseticida Permetrina 500ml</option><option>Raticida Brodifacoum Blocos</option></SelectField>
            <TextField label="Qtd" placeholder="0" />
          </div>
          <div>
            <FieldLabel>Fornecedores (multisseleção)</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <Chip>Química Brasil ✕</Chip>
              <Chip>PestControl ✕</Chip>
              <Chip muted>+ Adicionar</Chip>
            </div>
          </div>
          <TextField label="Prazo para resposta" placeholder="dd/mm/aaaa" />
          <TextareaField label="Observações" placeholder="Notas para os fornecedores" />
        </div>
      </Drawer>

      {/* Modal: registrar resposta */}
      {resp && (
        <Modal open onClose={() => setResp(null)}>
          <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
            <div>
              <h2 className="text-[19px] font-bold text-ink-900">Registrar resposta</h2>
              <p className="mt-0.5 text-[13px] text-ink-400">{resp.cod} · {resp.prod}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3.5 px-7 py-6">
            <SelectField label="Fornecedor"><option>Química Brasil</option><option>PestControl Ltda</option><option>AgroDefensivos S.A.</option></SelectField>
            <div className="grid grid-cols-2 gap-3.5">
              <TextField label="Valor" placeholder="R$ 0,00" />
              <TextField label="Prazo de entrega" placeholder="Ex.: 5 dias" />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <TextField label="Condições" placeholder="Ex.: 30 dias" />
              <TextField label="Validade da proposta" placeholder="dd/mm/aaaa" />
            </div>
          </div>
          <div className="flex gap-3 px-7 pb-6">
            {canEdit ? (
              <>
                <Button variant="secondary" fullWidth onClick={() => { setResp(null); showToast('Respostas do fornecedor registradas'); }} className="h-[52px]">Registrar resposta</Button>
                <Button fullWidth onClick={aprovar} className="h-[52px]">Aprovar vencedora</Button>
              </>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => setResp(null)} className="h-[52px]">Fechar</Button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function Row({ label, value, bold, last }: { label: string; value: string; bold?: boolean; last?: boolean }) {
  return (
    <div className={cn('flex justify-between py-1.5', !last && 'border-b border-ink-100')}>
      <span className="text-[13px] text-ink-500">{label}</span>
      <span className={cn('text-ink-800', bold ? 'text-[15px] font-bold text-ink-900' : 'text-sm')}>{value}</span>
    </div>
  );
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={cn('rounded-full px-3 py-1.5 text-[13px] font-semibold', muted ? 'bg-ink-100 font-medium text-ink-500' : 'bg-primary50 text-forest-700')}>
      {children}
    </span>
  );
}
