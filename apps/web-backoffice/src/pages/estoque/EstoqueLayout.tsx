import { Outlet, useLocation } from 'react-router-dom';
import {
  Boxes,
  MoveHorizontal,
  ReceiptText,
  ShoppingCart,
  Truck,
  Warehouse,
  Archive,
  Lock,
} from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { SubNav, type SubNavItem } from '@/components/ui/SubNav';

const items: SubNavItem[] = [
  { label: 'Produtos', icon: Boxes, to: '/estoque' },
  { label: 'Inventário', icon: MoveHorizontal, to: '/estoque/inventario' },
  { label: 'Cotações', icon: ReceiptText, to: '/estoque/cotacoes' },
  { label: 'Requisições', icon: ShoppingCart, to: '/estoque/requisicoes' },
  { label: 'Fornecedores', icon: Truck, to: '/estoque/fornecedores' },
  { label: 'Bases', icon: Warehouse, to: '/estoque/bases' },
  { label: 'Estoque', icon: Archive, to: '/estoque/saldo' },
];

const titles: Record<string, string> = {
  '/estoque': 'Produtos',
  '/estoque/inventario': 'Inventário',
  '/estoque/cotacoes': 'Cotações',
  '/estoque/requisicoes': 'Requisições de compras',
  '/estoque/fornecedores': 'Fornecedores',
  '/estoque/bases': 'Bases',
  '/estoque/saldo': 'Estoque',
};

/** Shell do módulo Estoque e Produtos: cabeçalho + sub-navegação + conteúdo. */
export function EstoqueLayout() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'Estoque e Produtos';

  return (
    <>
      <Topbar
        title={title}
        breadcrumb={`Início  /  Estoque e Produtos  /  ${title}`}
        action={
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink-100 px-3.5 py-1.5 text-xs font-semibold text-ink-500">
            <Lock className="h-4 w-4" />
            Acesso: Administrativo · Gestor · Almoxarifado
          </span>
        }
      />
      <div className="flex-1 px-8 py-6">
        <SubNav items={items} />
        <Outlet />
      </div>
    </>
  );
}
