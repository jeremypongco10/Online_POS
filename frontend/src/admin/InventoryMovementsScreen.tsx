import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { InventoryTransaction, Product, Store } from '../api/types';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';

const TYPE_LABELS: Record<InventoryTransaction['type'], string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  return: 'Return',
  adjustment: 'Adjustment',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
};

function typeColor(type: InventoryTransaction['type']): ChipProps['color'] {
  if (type === 'purchase' || type === 'transfer_in' || type === 'return') return 'success';
  if (type === 'sale' || type === 'transfer_out') return 'error';
  return 'default';
}

/** Read-only audit trail behind every stock change — pairs with InventoryScreen's Stock Levels tab. */
export function InventoryMovementsScreen() {
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, reload } =
    useList<InventoryTransaction>('/inventory/movements');

  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    api.get<Product[]>('/products?per_page=200&is_active=1').then(setProducts);
    api.get<Store[]>('/stores?per_page=50').then(setStores);
  }, []);

  const productLabel = (id: number) => {
    const p = products.find((x) => x.id === id);
    return p ? `${p.name} (${p.sku})` : `#${id}`;
  };
  const storeLabel = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;

  const columns: Column<InventoryTransaction>[] = [
    { key: 'created_at', label: 'Date', sortKey: 'created_at', render: (t) => new Date(t.created_at).toLocaleString() },
    { key: 'product', label: 'Product', render: (t) => productLabel(t.product_id) },
    { key: 'store', label: 'Store', render: (t) => storeLabel(t.store_id) },
    {
      key: 'type',
      label: 'Type',
      width: 130,
      render: (t) => <Chip size="small" label={TYPE_LABELS[t.type] ?? t.type} color={typeColor(t.type)} />,
    },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'right',
      sortKey: 'quantity',
      render: (t) => (parseFloat(t.quantity) > 0 ? `+${t.quantity}` : t.quantity),
    },
    { key: 'balance_after', label: 'Balance After', align: 'right', render: (t) => parseFloat(t.balance_after) },
    { key: 'notes', label: 'Notes', render: (t) => t.notes ?? '—' },
  ];

  return (
    <div>
      <ListToolbar search="" onSearchChange={() => {}} onRefresh={reload} refreshing={loading} />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(t) => t.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel="No stock movements yet."
      />
    </div>
  );
}
