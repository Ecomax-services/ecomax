import { useCallback, useEffect, useMemo, useState } from 'react';
import { Warehouse, TrendingDown, Clock, RefreshCw, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Drawer } from '@/components/ui/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { SelectField, SearchInput, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { listBases, createBase, updateBase, inativarBase, listLotes, type BaseRow, type StockRow } from '@/lib/estoque';
import { listGestores } from '@/lib/funcionarios';
import { maskCEP } from '@/lib/masks';

type DetailTab = 'dados' | 'estoque' | 'hist' | 'ops';
const emptyForm = { nome: '', cidade: '', uf: '', responsavel_id: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '' };

export function Bases() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');

  const [list, setList] = useState<BaseRow[]>([]);
  const [resps, setResps] = useState<{ id: string; nome: string }[]>([]);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<{ base?: BaseRow; isNew: boolean } | null>(null);
  const [detail, setDetail] = useState<BaseRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('dados');
  const [detailLotes, setDetailLotes] = useState<StockRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setList(await listBases()); } catch (e) { showToast((e as Error).message); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { listGestores().then(setResps); }, []);
  useEffect(() => {
    if (detail && detailTab === 'estoque') listLotes(detail.id).then(setDetailLotes).catch(() => setDetailLotes([]));
  }, [detail, detailTab]);

  const openNew = () => { setForm(emptyForm); setDrawer({ isNew: true }); };
  const openEdit = (b: BaseRow) => {
    setForm({
      nome: b.nome, cidade: b.cidade === '—' ? '' : b.cidade, uf: b.uf, responsavel_id: b.responsavel_id ?? '',
      cep: b.cep ?? '', logradouro: b.logradouro ?? '', numero: b.numero ?? '', complemento: b.complemento ?? '', bairro: b.bairro ?? '',
    });
    setDetail(null); setDrawer({ base: b, isNew: false });
  };

  const rows = useMemo(
    () => list.filter((b) => `${b.nome} ${b.cidade} ${b.resp}`.toLowerCase().includes(search.toLowerCase())),
    [list, search],
  );

  const kpis = [
    { icon: Warehouse, tone: 'green' as const, label: 'Bases ativas', value: list.filter((b) => b.status === 'Ativa').length },
    { icon: TrendingDown, tone: 'red' as const, label: 'Bases inativas', value: list.filter((b) => b.status !== 'Ativa').length },
    { icon: Clock, tone: 'muted' as const, label: 'Sem movimentação (30d)', value: 0 },
    { icon: RefreshCw, tone: 'amber' as const, label: 'Transferências pendentes', value: 0 },
  ];

  const save = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome da base.');
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(), cidade: form.cidade || null, uf: form.uf || null, responsavel_id: form.responsavel_id || null,
        cep: form.cep || null, logradouro: form.logradouro || null, numero: form.numero || null, complemento: form.complemento || null, bairro: form.bairro || null,
      };
      if (drawer?.isNew) await createBase(payload);
      else if (drawer?.base) await updateBase(drawer.base.id, payload);
      setDrawer(null);
      showToast('Base salva');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const inativar = async (b: BaseRow) => {
    try { await inativarBase(b.id); setDetail(null); showToast('Base inativada'); await load(); }
    catch (e) { showToast((e as Error).message); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const up = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <>
      <div className="mb-5 grid grid-cols-4 gap-3.5">{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar base, cidade ou responsável" />
        {canCreate && <Button onClick={openNew}><Plus className="h-5 w-5" />Nova base</Button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className={cn(th, 'pl-6')}>Base</th>
              <th className={th}>Cidade / UF</th>
              <th className={th}>Responsável</th>
              <th className={cn(th, 'text-center')}>Produtos</th>
              <th className={cn(th, 'text-center')}>Itens</th>
              <th className={cn(th, 'pr-6')}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} onClick={() => { setDetail(b); setDetailTab('dados'); }} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">{b.nome}{b.central && <span className="ml-2 text-xs font-normal text-ink-400">(Central)</span>}</td>
                <td className="px-4 py-3.5 text-sm text-ink-700">{b.cidade} / {b.uf}</td>
                <td className="px-4 py-3.5 text-sm text-ink-700">{b.resp}</td>
                <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{b.prods}</td>
                <td className="px-4 py-3.5 text-center text-sm text-ink-700">{b.itens}</td>
                <td className="px-4 py-3.5 pr-6"><Badge tone={b.tone}>{b.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-ink-100 px-6 py-3.5 text-[13px] text-ink-400">
          Base com estoque maior que zero não pode ser inativada.
        </p>
      </div>

      {/* Drawer novo/editar */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.isNew ? 'Nova base' : 'Editar base'}
        subtitle="Localização física de estoque"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(null)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar base'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Nome da base" required value={form.nome} onChange={(e) => up('nome', e.target.value)} placeholder="Ex.: Base Campinas" />
          <div className="grid grid-cols-[2fr_1fr] gap-3.5">
            <TextField label="Cidade" value={form.cidade} onChange={(e) => up('cidade', e.target.value)} placeholder="Cidade" />
            <TextField label="UF" value={form.uf} onChange={(e) => up('uf', e.target.value)} placeholder="SP" />
          </div>
          <SelectField label="Responsável" value={form.responsavel_id} onChange={(e) => up('responsavel_id', e.target.value)} options={[{ value: '', label: 'Sem responsável' }, ...resps.map((r) => ({ value: r.id, label: r.nome }))]} />
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Endereço</p>
          <div className="grid grid-cols-[1fr_2fr] gap-3.5">
            <TextField label="CEP" inputMode="numeric" value={form.cep} onChange={(e) => up('cep', maskCEP(e.target.value))} placeholder="00000-000" />
            <TextField label="Logradouro" value={form.logradouro} onChange={(e) => up('logradouro', e.target.value)} placeholder="Rua / Av." />
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-3.5">
            <TextField label="Número" value={form.numero} onChange={(e) => up('numero', e.target.value)} placeholder="Nº" />
            <TextField label="Complemento" value={form.complemento} onChange={(e) => up('complemento', e.target.value)} placeholder="Sala, galpão…" />
          </div>
          <TextField label="Bairro" value={form.bairro} onChange={(e) => up('bairro', e.target.value)} placeholder="Bairro" />
        </div>
      </Drawer>

      {/* Drawer detalhe */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        width={560}
        title={<span className="flex items-center gap-2.5">{detail?.nome}{detail && <Badge tone={detail.tone}>{detail.status}</Badge>}</span>}
        headerExtra={
          <Tabs
            tabs={[{ key: 'dados', label: 'Dados cadastrais' }, { key: 'estoque', label: 'Estoque atual' }, { key: 'hist', label: 'Histórico de transferências' }, { key: 'ops', label: 'Operadores vinculados' }]}
            value={detailTab}
            onChange={setDetailTab}
          />
        }
      >
        {detail && detailTab === 'dados' && (
          <>
            <div className="grid grid-cols-2 gap-x-6">
              <Info2 label="Cidade / UF" value={`${detail.cidade} / ${detail.uf}`} />
              <Info2 label="Responsável" value={detail.resp} />
              <Info2 label="Endereço" value={detail.endereco} />
              <Info2 label="CEP" value={detail.cep || '—'} />
              <Info2 label="Produtos" value={String(detail.prods)} />
              <Info2 label="Itens em estoque" value={String(detail.itens)} />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-4 py-3 text-[13px] text-tag-softWarnFg">
              <Info className="h-[18px] w-[18px]" />
              Base com estoque maior que zero não pode ser inativada.
            </div>
            {canEdit && (
              <div className="mt-4 flex gap-2.5">
                <Button size="sm" onClick={() => openEdit(detail)}>Editar base</Button>
                {!detail.central && (
                  <Button variant="secondary" size="sm" className="border-[#ffb8a8] text-danger-bright" onClick={() => inativar(detail)}>Inativar base</Button>
                )}
              </div>
            )}
          </>
        )}
        {detail && detailTab === 'estoque' && (
          <>
            <p className="mb-3 text-[13px] text-ink-400">Estoque atual da base.</p>
            <table className="w-full border-collapse">
              <thead><tr className="bg-ink-50">{['Produto', 'Lote', 'Qtd'].map((h, i) => <th key={h} className={cn('px-3.5 py-2.5 text-xs font-bold uppercase text-ink-400', i === 2 ? 'text-center' : 'text-left')}>{h}</th>)}</tr></thead>
              <tbody>
                {detailLotes.length === 0 && <tr><td colSpan={3} className="px-3.5 py-6 text-center text-sm text-ink-400">Sem estoque nesta base.</td></tr>}
                {detailLotes.map((l) => (
                  <tr key={l.id} className="border-t border-ink-100">
                    <td className="px-3.5 py-3 text-sm text-ink-800">{l.prod}</td>
                    <td className="px-3.5 py-3 text-sm text-ink-600">{l.lote}</td>
                    <td className="px-3.5 py-3 text-center text-sm font-bold text-ink-900">{l.qtd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {detail && (detailTab === 'hist' || detailTab === 'ops') && (
          <p className="py-10 text-center text-[13px] text-ink-400">Disponível em breve.</p>
        )}
      </Drawer>
    </>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-ink-100 py-3">
      <div className="text-[13px] text-ink-400">{label}</div>
      <div className="mt-0.5 text-[15px] text-ink-800">{value}</div>
    </div>
  );
}
