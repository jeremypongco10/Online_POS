import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Reading, Register, Store, ZReading } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import { formatMoney } from '../pos/format';
import { formatDateTime } from '../regional';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

/**
 * Settings for the register-close paperwork BIR expects: an X-reading
 * that looks at a terminal's figures without closing anything, and a
 * Z-reading that closes the period, is kept permanently, and advances
 * that terminal's Z counter.
 *
 * The two are printed from the same layout on purpose — a Z that looked
 * different from the X taken a minute earlier would invite the question
 * of which one is the machine's real position. Only the banner, the
 * counter and the permanence differ.
 */
export function ReadingsTab() {
  const { user, hasPermission } = useAuth();
  const canGenerate = hasPermission('readings.manage');
  const confirm = useConfirm();
  const notify = useSnackbar();

  const [registers, setRegisters] = useState<Register[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [registerId, setRegisterId] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [loadingX, setLoadingX] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing] = useState<ZReading | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Store[]>(`/stores?company_id=${user.company_id}&per_page=200`).then(setStores);
    api.get<Register[]>('/registers?per_page=200').then((rows) => {
      setRegisters(rows);
      setRegisterId((prev) => prev || (rows.length > 0 ? String(rows[0].id) : ''));
    });
  }, [user]);

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, reload } = useList<ZReading>('/readings/z', {
    register_id: registerId || undefined,
  });

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name ?? `#${id}`;

  async function takeX() {
    if (!registerId) return;
    setLoadingX(true);
    try {
      setReading(await api.get<Reading>(`/readings/x?register_id=${registerId}`));
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to take the X-reading', 'error');
    } finally {
      setLoadingX(false);
    }
  }

  async function takeZ() {
    if (!registerId) return;
    const name = registers.find((r) => String(r.id) === registerId)?.name ?? 'this terminal';
    const ok = await confirm(
      `Close the period on ${name} and issue a Z-reading? This is permanent — the reading is kept on record and the terminal's Z counter moves on.`,
      { title: 'Issue Z-Reading', confirmLabel: 'Issue Z-Reading' }
    );
    if (!ok) return;

    setGenerating(true);
    try {
      const z = await api.post<ZReading>('/readings/z', { register_id: Number(registerId) });
      setReading({ ...z, type: 'Z' } as unknown as Reading);
      reload();
      notify(`Z-reading #${z.z_counter} issued`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to issue the Z-reading', 'error');
    } finally {
      setGenerating(false);
    }
  }

  const registerOptions = useMemo(
    () => registers.map((r) => ({ value: String(r.id), label: `${r.name} (${r.code})` })),
    [registers]
  );

  const columns: Column<ZReading>[] = [
    { key: 'z_counter', label: 'Z #', width: 90, render: (r) => <strong>{r.z_counter}</strong> },
    { key: 'business_date', label: 'Business Date', width: 150, render: (r) => r.business_date.slice(0, 10) },
    { key: 'store', label: 'Branch', render: (r) => storeName(r.store_id) },
    { key: 'transaction_count', label: 'Txns', width: 90, align: 'right', render: (r) => r.transaction_count },
    { key: 'net_sales', label: 'Net Sales', width: 140, align: 'right', render: (r) => formatMoney(Number(r.net_sales)) },
    { key: 'vat_amount', label: 'VAT', width: 130, align: 'right', render: (r) => formatMoney(Number(r.vat_amount)) },
    {
      key: 'ending_grand_total',
      label: 'Grand Total',
      width: 160,
      align: 'right',
      render: (r) => formatMoney(Number(r.ending_grand_total)),
    },
  ];

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <ReceiptLongOutlinedIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Take a reading
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          An X-reading shows where a terminal stands right now and changes nothing — take as many as you like. A Z-reading closes the period,
          is kept permanently, and moves that terminal's Z counter on by one.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Box sx={{ minWidth: 280 }}>
            <SearchableSelect label="Terminal" value={registerId} onChange={setRegisterId} options={registerOptions} fullWidth />
          </Box>
          <Button variant="outlined" onClick={takeX} disabled={!registerId || loadingX}>
            {loadingX ? 'Reading…' : 'X-Reading'}
          </Button>
          {canGenerate && (
            <Button variant="contained" onClick={takeZ} disabled={!registerId || generating}>
              {generating ? 'Issuing…' : 'Z-Reading'}
            </Button>
          )}
        </Stack>
      </Paper>

      {reading && <ReadingSlip reading={reading} onClose={() => setReading(null)} />}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Issued Z-Readings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Every Z a terminal has ever produced, in order. A gap in the Z numbers is a missing close, which is exactly what this list exists to
          make visible.
        </Typography>

        <ListToolbar
          onRefresh={reload}
          refreshing={loading}
          extra={
            <InlineSelectFilter
              label="Terminal"
              value={registerId}
              onChange={setRegisterId}
              minWidth={200}
              options={[{ value: '', label: 'All terminals' }, ...registerOptions]}
            />
          }
        />

        <DataTable
          columns={columns}
          rows={data}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          meta={meta}
          page={page}
          onPageChange={setPage}
          perPage={perPage}
          onPerPageChange={setPerPage}
          emptyLabel="No Z-readings issued yet. Taking one closes the current period on that terminal."
          rowActions={(r) => (
            <Tooltip title="View">
              <IconButton size="small" aria-label="View" onClick={() => setViewing(r)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        />
      </Paper>

      <Modal open={!!viewing} title={viewing ? `Z-Reading #${viewing.z_counter}` : ''} onClose={() => setViewing(null)} compact>
        {viewing && <ReadingBody reading={{ ...viewing, type: 'Z' } as unknown as Reading} />}
      </Modal>
    </Stack>
  );
}

/** The just-taken reading, shown inline under the controls that produced it. */
function ReadingSlip({ reading, onClose }: { reading: Reading; onClose: () => void }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {reading.type === 'Z' ? `Z-Reading #${reading.z_counter}` : 'X-Reading'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => window.print()}>
            Print
          </Button>
          <Button size="small" onClick={onClose}>
            Dismiss
          </Button>
        </Stack>
      </Stack>
      {reading.type === 'X' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nothing has been closed or recorded — this is a look at the terminal as it stands.
        </Alert>
      )}
      <ReadingBody reading={reading} />
    </Paper>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.3, fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </Stack>
  );
}

/** The reading itself, laid out the way it prints. */
function ReadingBody({ reading }: { reading: Reading }) {
  const money = (v: string | number) => formatMoney(Number(v));

  return (
    <Box sx={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13, maxWidth: 560 }}>
      <Line label="Terminal" value={reading.register_name ?? `#${reading.register_id}`} />
      <Line label="MIN" value={reading.min_no ?? '—'} />
      <Line label="Serial No" value={reading.pos_serial_no ?? '—'} />
      <Line label="PTU No" value={reading.ptu_number ?? '—'} />
      <Line label="Z Counter" value={String(reading.z_counter)} />
      <Line label="Reset Counter" value={String(reading.reset_counter)} />
      <Divider sx={{ my: 1 }} />

      <Line label="Covers From" value={formatDateTime(reading.covers_from)} />
      <Line label="Covers To" value={formatDateTime(reading.covers_to)} />
      <Line label="Beginning Invoice" value={reading.beginning_invoice_number ?? '—'} />
      <Line label="Ending Invoice" value={reading.ending_invoice_number ?? '—'} />
      <Divider sx={{ my: 1 }} />

      <Line label="Transactions" value={String(reading.transaction_count)} />
      <Line label="Gross Sales" value={money(reading.gross_sales)} />
      <Line label="Less Discounts" value={`-${money(reading.discount_total)}`} />
      <Line label="Net Sales" value={money(reading.net_sales)} bold />
      <Divider sx={{ my: 1 }} />

      <Line label="VATable Sales" value={money(reading.vatable_sales)} />
      <Line label="VAT Amount" value={money(reading.vat_amount)} />
      <Line label="VAT-Exempt Sales" value={money(reading.vat_exempt_sales)} />
      <Line label="Zero-Rated Sales" value={money(reading.zero_rated_sales)} />
      <Line label="Non-VAT Sales" value={money(reading.non_vat_sales)} />
      <Divider sx={{ my: 1 }} />

      <Line label="Senior Citizen Disc." value={money(reading.sc_discount_total)} />
      <Line label="PWD Discount" value={money(reading.pwd_discount_total)} />
      <Line label="5% BNPC Discount" value={money(reading.bnpc_discount_total)} />
      <Line label="Other Discounts" value={money(reading.other_discount_total)} />
      <Divider sx={{ my: 1 }} />

      <Line label={`Voids (${reading.void_count})`} value={money(reading.void_total)} />
      <Line label={`Returns (${reading.return_count})`} value={money(reading.return_total)} />
      <Divider sx={{ my: 1 }} />

      <Line label="Beginning Grand Total" value={money(reading.beginning_grand_total)} />
      <Line label="Ending Grand Total" value={money(reading.ending_grand_total)} bold />
    </Box>
  );
}

/** Shown while the register list is still loading, so the tab never flashes an empty picker. */
export function ReadingsLoading() {
  return (
    <Stack sx={{ alignItems: 'center', py: 6 }}>
      <CircularProgress size={22} />
    </Stack>
  );
}
