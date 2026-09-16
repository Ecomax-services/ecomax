import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Check } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { TextField, TextareaField, SearchInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  CATALOGOS, listCatalogoItens, contarItensPorCatalogo, createCatalogoItem, updateCatalogoItem,
  setCatalogoItemAtivo, listCatalogoAtivos, type CatalogoItem, type CatalogoMeta,
} from '@/lib/configuracoes';
import { PALETA_TAGS as PALETA } from '@/lib/paletaTags';
import { PainelPlanilha, PainelProdutosPorTipo } from './CadastrosEspeciais';
import { maskInt } from '@/lib/masks';

type DrawerState = { item?: CatalogoItem; isNew: boolean };

export function CadastrosAuxiliares() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('configuracoes', 'criar');
  const canEdit = can('configuracoes', 'editar');

  const [catKey, setCatKey] = useState<string>(CATALOGOS[0].key);
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [form, setForm] = useState({ nome: '', observacao: '', cor_bg: '', cor_fg: '', ativo: true, template_mensagem: '', prazo_padrao: '' });
  const [saving, setSaving] = useState(false);

  const meta = useMemo<CatalogoMeta>(() => CATALOGOS.find((c) => c.key === catKey)!, [catKey]);

  // Contagem de todos os catálogos, para a pílula que o protótipo mostra em
  // cada linha da coluna. Recarrega quando o catálogo aberto muda porque criar
  // ou excluir um item altera o número da linha correspondente.
  const [contagens, setContagens] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      // Os dois especiais não vivem em catalogo_itens: a pílula deles conta
      // tipos de serviço, que é o eixo das abas dos dois painéis.
      const [totais, tiposServico] = await Promise.all([contarItensPorCatalogo(), listCatalogoAtivos('tipos_servico')]);
      setContagens({ ...totais, planilhas: tiposServico.length, produtos_tipo: tiposServico.length });
      if (!meta.especial) setItems(await listCatalogoItens(catKey));
    } catch (e) { showToast((e as Error).message); }
  }, [catKey, meta.especial, showToast]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () => items.filter((it) => it.nome.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const openNew = () => {
    setForm({ nome: '', observacao: '', cor_bg: meta.colored ? PALETA[0].bg : '', cor_fg: meta.colored ? PALETA[0].fg : '', ativo: true, template_mensagem: '', prazo_padrao: '' });
    setDrawer({ isNew: true });
  };
  const openEdit = (it: CatalogoItem) => {
    setForm({
      nome: it.nome, observacao: it.observacao ?? '', cor_bg: it.cor_bg ?? '', cor_fg: it.cor_fg ?? '',
      ativo: it.ativo, template_mensagem: it.template_mensagem ?? '', prazo_padrao: it.prazo_padrao != null ? String(it.prazo_padrao) : '',
    });
    setDrawer({ item: it, isNew: false });
  };

  const save = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome do item.');
    setSaving(true);
    try {
      const payload = {
        catalogo: catKey,
        nome: form.nome.trim(),
        observacao: form.observacao.trim() || null,
        cor_bg: meta.colored ? form.cor_bg || null : null,
        cor_fg: meta.colored ? form.cor_fg || null : null,
        template_mensagem: meta.servico ? (form.template_mensagem.trim() || null) : null,
        prazo_padrao: meta.servico && form.prazo_padrao ? Number(form.prazo_padrao) : null,
        ativo: form.ativo,
      };
      if (drawer?.isNew) await createCatalogoItem(payload);
      else if (drawer?.item) await updateCatalogoItem(drawer.item.id, payload);
      setDrawer(null);
      showToast('Item salvo');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const toggleAtivo = async (it: CatalogoItem) => {
    try { await setCatalogoItemAtivo(it.id, !it.ativo); showToast(it.ativo ? 'Item inativado' : 'Item ativado'); await load(); }
    catch (e) { showToast((e as Error).message); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const up = (k: keyof typeof form, v: string | boolean) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <>
      <Topbar title="Cadastros Auxiliares" breadcrumb="Início  /  Configurações  /  Cadastros Auxiliares" />
      <div className="flex-1 px-8 py-6">
        <Link to="/configuracoes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar
        </Link>

        <div className="grid grid-cols-[240px_1fr] gap-5">
          {/* Lista de catálogos */}
          <div className="self-start rounded-2xl border border-ink-100 bg-white p-2">
            <p className="px-3 pb-2 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Catálogos</p>
            {CATALOGOS.map((c) => (
              <button
                key={c.key}
                onClick={() => { setCatKey(c.key); setSearch(''); }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-left text-[13px] leading-tight transition-colors',
                  c.key === catKey ? 'border border-forest-accent bg-forest-50 font-semibold text-forest-900' : 'border border-transparent font-medium text-ink-700 hover:bg-ink-50',
                )}
              >
                <span>{c.label}</span>
                <span className="shrink-0 rounded-full bg-ink-50 px-2 py-0.5 text-xs text-ink-400">
                  {c.key === catKey && !c.especial ? items.length : contagens[c.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {meta.especial === 'planilha' && <PainelPlanilha perms={{ canCreate, canEdit }} />}
          {meta.especial === 'produtos_tipo' && <PainelProdutosPorTipo perms={{ canCreate, canEdit, canDesvincular: can('configuracoes', 'excluir') }} />}

          {/* Itens do catálogo */}
          {!meta.especial && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[17px] font-bold text-ink-900">{meta.label}</span>
                <span className="text-[13px] text-ink-400">{items.length} itens cadastrados</span>
              </div>
              {canCreate && <Button onClick={openNew}><Plus className="h-5 w-5" />Novo item</Button>}
            </div>

            <SearchInput containerClassName="mb-4 w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar item" />

            <div className="rounded-2xl border border-ink-100 bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-ink-50">
                    <th className={cn(th, 'pl-6')}>Nome</th>
                    <th className={cn(th, 'text-center')}>Em uso</th>
                    <th className={cn(th, 'text-center')}>Status</th>
                    <th className={cn(th, 'pr-6 text-right')}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum item.</td></tr>}
                  {rows.map((it) => (
                    <tr key={it.id} className="border-t border-ink-100">
                      <td className="px-4 py-3.5 pl-6">
                        {meta.colored && it.cor_bg ? (
                          <span className="inline-block rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: it.cor_bg, color: it.cor_fg ?? '#000' }}>{it.nome}</span>
                        ) : (
                          <span className="text-sm font-medium text-ink-800">{it.nome}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-ink-600">{it.uso > 0 ? `${it.uso} ${it.uso === 1 ? 'registro' : 'registros'}` : '—'}</td>
                      <td className="px-4 py-3.5 text-center"><Badge tone={it.ativo ? 'success' : 'muted'}>{it.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                      <td className="px-4 py-3.5 pr-6 text-right">
                        {!canEdit && <span className="text-[13px] text-ink-400">—</span>}
                        <div className="inline-flex justify-end gap-2">
                          {canEdit && <ActionBtn onClick={() => openEdit(it)}>Editar</ActionBtn>}
                          {canEdit && <ActionBtn onClick={() => toggleAtivo(it)}>{it.ativo ? 'Inativar' : 'Reativar'}</ActionBtn>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-ink-100 px-6 py-3.5 text-[13px] text-ink-400">
                {meta.slug
                  ? 'Itens em uso por alguma OS não podem ser inativados — a OS ficaria com uma situação que o sistema não reconhece.'
                  : 'Itens que saem de uso são inativados: os registros feitos com eles continuam legíveis.'}
              </p>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Drawer novo/editar item */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.isNew ? 'Novo item' : 'Editar item'}
        subtitle={meta.label}
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(null)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar item'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Nome" required value={form.nome} onChange={(e) => up('nome', e.target.value)} placeholder="Nome do item" />

          {meta.colored && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-700">Cor da etiqueta</p>
              <div className="flex flex-wrap gap-2">
                {PALETA.map((p) => {
                  const sel = form.cor_bg === p.bg && form.cor_fg === p.fg;
                  return (
                    <button
                      key={p.bg}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, cor_bg: p.bg, cor_fg: p.fg }))}
                      className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ring-2 ring-offset-1', sel ? 'ring-forest-accent' : 'ring-transparent')}
                      style={{ background: p.bg, color: p.fg }}
                    >
                      {sel && <Check className="h-3.5 w-3.5" />}{form.nome || p.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {meta.servico && (
            <div className="grid grid-cols-[1fr_120px] gap-3.5">
              <TextField label="Prazo padrão (dias)" inputMode="numeric" value={form.prazo_padrao} onChange={(e) => up('prazo_padrao', maskInt(e.target.value))} placeholder="Ex.: 7" />
              <div />
            </div>
          )}
          {meta.servico && (
            <TextareaField label="Template de mensagem (link público)" value={form.template_mensagem} onChange={(e) => up('template_mensagem', e.target.value)} placeholder="Mensagem padrão enviada ao cliente" />
          )}

          <TextareaField label="Observação" value={form.observacao} onChange={(e) => up('observacao', e.target.value)} placeholder="Notas internas (opcional)" />

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
            <input type="checkbox" checked={form.ativo} onChange={(e) => up('ativo', e.target.checked)} className="h-4 w-4 accent-forest-600" />
            Item ativo
          </label>
          {!drawer?.isNew && drawer?.item && drawer.item.uso > 0 && (
            <p className="rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-4 py-3 text-[13px] text-tag-softWarnFg">
              Este item está em uso em {drawer.item.uso} registro(s): pode ser inativado, mas não excluído.
            </p>
          )}
        </div>
      </Drawer>

    </>
  );
}

function ActionBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn('rounded-lg border px-3 py-1.5 text-[13px] font-semibold', danger ? 'border-[#ffb8a8] bg-white text-danger-bright' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50')}
    >
      {children}
    </button>
  );
}
