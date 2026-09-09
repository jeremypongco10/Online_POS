import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { api, ApiError } from '../api/client';
import type { AdminUser, CashMovement, CashSession, CashSessionSummary, Register, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatMoney } from '../pos/format';
import { DataTable, type Column } from './DataTable';
import { DetailView, type DetailField } from './DetailView';
import { InlineSelectFilter } from './InlineSelectFilter';
import { ListToolbar } from './ListToolbar';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import { useList } from './useList';
import { formatDateTime } from '../regional';

const money = (v: string | number | null | undefined) => (v === null || v === undefined ? '—' : formatMoney(Number(v)));

/**
 * Cash in/out against an open drawer — moved here from the POS screen's
 * header overflow menu.
 *
 * Why it belongs in the Back Office rather than at the till: taking cash
 * *out* of a drawer mid-shift is the one drawer operation that isn't a
 * sale and leaves no product trail behind it. Recording it here puts it
 * in front of whoever is already watching the money, instead of one tap
 * away from the person holding the drawer.
 *
 * The API only accepts a movement against an OPEN session
 * (CashSessionsController::addMovement answers 422 otherwise) — a closed
 * session's expected-versus-counted difference is already reconciled, so
 * back-dating a movement into it would rewrite a settled count. This
 * screen mirrors that rule up front rather than letting the user find it
 * out by submitting.
 */
export function CashDrawersScreen() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('cash-sessions.manage');

  // Defaults to Open: the only drawers you can act on are the open ones,
  // and on a busy day the closed list is every shift ever run.
  const [status, setStatus] = useState('open');
  const [registerId, setRegisterId] = useState('');

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, reload } = useList<CashSession>(
    '/cash-sessions',
    { status: status || undefined, register_id: registerId || undefined },
  );

  const [registers, setRegisters] = useState<Register[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [viewing, setViewing] = useState<CashSession | null>(null);

  useEffect(() => {
    api.get<Register[]>('/registers?per_page=200').then(setRegisters).catch(() => setRegisters([]));
    api.get<Store[]>('/stores?per_page=100').then(setStores).catch(() => setStores([]));
    api.get<AdminUser[]>('/users?per_page=200').then(setUsers).catch(() => setUsers([]));
  }, []);

  const registerLabel = (id: number) => registers.find((r) => r.id === id)?.name ?? `#${id}`;
  const registerStore = (id: number) => {
    const storeId = registers.find((r) => r.id === id)?.store_id;
    return storeId === undefined ? null : (stores.find((s) => s.id === storeId)?.name ?? null);
  };
  // Terminal names are only unique within a store — a chain typically has a
  // "Register 1" in every branch — and this screen spans every store the
  // user can see, so the name alone leaves two identical-looking rows.
  const terminalLabel = (id: number) => {
    const store = registerStore(id);
    return store ? `${registerLabel(id)} · ${store}` : registerLabel(id);
  };
  const userLabel = (id: number | null) => (id === null ? 'System' : (users.find((u) => u.id === id)?.name ?? `#${id}`));

  const columns: Column<CashSession>[] = [
    { key: 'opened_at', label: 'Opened', sortKey: 'opened_at', render: (s) => formatDateTime(s.opened_at, user?.currency) },
    { key: 'register', label: 'POS Terminal', render: (s) => terminalLabel(s.register_id) },
    { key: 'cashier', label: 'Cashier', render: (s) => userLabel(s.user_id) },
    { key: 'opening_balance', label: 'Opening', align: 'right', render: (s) => money(s.opening_balance) },
    { key: 'closing_balance', label: 'Counted', align: 'right', render: (s) => money(s.closing_balance) },
    {
      key: 'difference',
      label: 'Difference',
      align: 'right',
      render: (s) => {
        if (s.difference === null) return '—';
        const diff = Number(s.difference);
        // Over and short are both worth a second look, but only a shortage
        // is money that left — so red is reserved for it, and an overage
        // stays neutral rather than borrowing "success" green.
        return (
          <Box component="span" sx={{ fontWeight: 600, color: diff < 0 ? 'error.main' : 'text.primary' }}>
            {diff > 0 ? `+${money(diff)}` : money(diff)}
          </Box>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: 110,
      render: (s) => (
        <Chip
          size="small"
          label={s.status === 'open' ? 'Open' : 'Closed'}
          color={s.status === 'open' ? 'success' : 'default'}
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 60,
      align: 'right',
      render: (s) => (
        <Tooltip title={s.status === 'open' && canManage ? 'View and record movements' : 'View movements'}>
          <IconButton size="small" aria-label="View" onClick={() => setViewing(s)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <ListToolbar
        onRefresh={reload}
        refreshing={loading}
        extra={
          <>
            <InlineSelectFilter
              label="Status"
              value={status}
              onChange={setStatus}
              compactOnMobile
              options={[
                { value: '', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            <InlineSelectFilter
              label="Terminal"
              value={registerId}
              onChange={setRegisterId}
              compactOnMobile
              minWidth={180}
              options={[{ value: '', label: 'All Terminals' }, ...registers.map((r) => ({ value: String(r.id), label: terminalLabel(r.id) }))]}
            />
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(s) => s.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel={status === 'open' ? 'No drawer is open right now.' : 'No cash drawer sessions yet.'}
      />

      {viewing && (
        <CashSessionModal
          session={viewing}
          canManage={canManage}
          registerName={registerLabel(viewing.register_id)}
          registerLabel={terminalLabel(viewing.register_id)}
          cashierLabel={userLabel(viewing.user_id)}
          userLabel={userLabel}
          onClose={() => setViewing(null)}
          onRecorded={reload}
        />
      )}
    </div>
  );
}

interface ModalProps {
  session: CashSession;
  canManage: boolean;
  registerName: string;
  registerLabel: string;
  cashierLabel: string;
  userLabel: (id: number | null) => string;
  onClose: () => void;
  /** Refreshes the list behind the modal — a movement moves the drawer's Expected Cash. */
  onRecorded: () => void;
}

function CashSessionModal({ session, canManage, registerName, registerLabel, cashierLabel, userLabel, onClose, onRecorded }: ModalProps) {
  // Dates in this modal follow the company's country, same as the list behind it.
  const { user } = useAuth();
  const isOpen = session.status === 'open';
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [s, m] = await Promise.all([
        api.get<CashSessionSummary>(`/cash-sessions/${session.id}/summary`),
        api.get<CashMovement[]>(`/cash-sessions/${session.id}/movements`),
      ]);
      setSummary(s);
      setMovements(m);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load this drawer');
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Expected Cash comes from the live /summary while a drawer is open and
  // from the stored column once it's closed — the endpoint recomputes from
  // current sales, which is the right number only while sales can still
  // land in it.
  const fields: DetailField[] = [
    { label: 'POS Terminal', value: registerLabel },
    { label: 'Cashier', value: cashierLabel },
    { label: 'Opened', value: formatDateTime(session.opened_at, user?.currency) },
    { label: 'Closed', value: formatDateTime(session.closed_at, user?.currency) },
    { label: 'Opening Cash', value: money(session.opening_balance) },
    { label: 'Cash Sales', value: summary ? money(summary.cash_sales_total) : '—' },
    { label: 'Cash In', value: summary ? money(summary.cash_in_total) : '—' },
    { label: 'Cash Out', value: summary ? money(summary.cash_out_total) : '—' },
    { label: 'Expected Cash', value: isOpen ? (summary ? money(summary.expected_balance) : '—') : money(session.expected_balance) },
    { label: 'Counted Cash', value: money(session.closing_balance) },
  ];

  return (
    <Modal title={`Drawer — ${registerName}`} onClose={onClose} wide>
      <Stack spacing={2.5}>
        {loadError && <Alert severity="error">{loadError}</Alert>}

        <DetailView fields={fields} dense />

        {canManage &&
          (isOpen ? (
            <RecordMovementForm
              sessionId={session.id}
              onRecorded={() => {
                void load();
                onRecorded();
              }}
            />
          ) : (
            <Alert severity="info">
              This drawer is closed. Its count is already reconciled, so no further cash movements can be recorded against it.
            </Alert>
          ))}

        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
            Movement History
          </Typography>
          {loading ? (
            <Stack sx={{ alignItems: 'center', py: 3 }}>
              <CircularProgress size={22} />
            </Stack>
          ) : movements.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No cash movements recorded on this drawer.
            </Typography>
          ) : (
            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} sx={{ mt: 0.5 }}>
              {movements.map((m) => (
                <Stack key={m.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                  <Chip
                    size="small"
                    label={m.type === 'cash_in' ? 'In' : 'Out'}
                    color={m.type === 'cash_in' ? 'success' : 'error'}
                    sx={{ fontWeight: 600, minWidth: 52 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {m.reason || (m.type === 'cash_in' ? 'Cash in' : 'Cash out')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(m.created_at, user?.currency)} · {userLabel(m.user_id)}
                    </Typography>
                  </Box>
                  {/* Signed, because a bare amount in a list that mixes both
                      directions reads as a running total that doesn't add up. */}
                  <Typography variant="body2" sx={{ fontWeight: 700, color: m.type === 'cash_in' ? 'success.main' : 'error.main' }}>
                    {m.type === 'cash_in' ? '+' : '−'}
                    {money(m.amount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Modal>
  );
}

function RecordMovementForm({ sessionId, onRecorded }: { sessionId: number; onRecorded: () => void }) {
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amount = parseFloat(amountText);
  const valid = Number.isFinite(amount) && amount > 0;

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/cash-sessions/${sessionId}/movements`, { type, amount, reason: reason || undefined });
      setAmountText('');
      setReason('');
      onRecorded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record movement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
        Record a Movement
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.25, alignItems: 'flex-start' }}>
        <SearchableSelect
          label="Type"
          value={type}
          onChange={(v) => setType(v as 'cash_in' | 'cash_out')}
          sx={{ width: { xs: '100%', sm: 210 }, flexShrink: 0 }}
          options={[
            { value: 'cash_out', label: 'Cash Out' },
            { value: 'cash_in', label: 'Cash In' },
          ]}
        />
        <TextField
          label="Amount"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          sx={{ width: { xs: '100%', sm: 140 } }}
        />
        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. petty cash"
          sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}
        />
        <Button
          variant="contained"
          onClick={submit}
          disabled={submitting || !valid}
          sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0, height: 56 }}
        >
          Record
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
