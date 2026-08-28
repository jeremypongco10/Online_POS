import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuditLog } from '../api/types';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { DetailView } from './DetailView';
import { SearchField } from '../SearchField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'void', label: 'Void' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'cancel', label: 'Cancel' },
  { value: 'receive', label: 'Receive' },
  { value: 'adjust', label: 'Adjust' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'activate', label: 'Activate' },
  { value: 'deactivate', label: 'Deactivate' },
  { value: 'reset-password', label: 'Reset Password' },
  { value: 'points-adjust', label: 'Points Adjust' },
  { value: 'login', label: 'Login' },
  { value: 'login-failed', label: 'Login Failed' },
  { value: 'logout', label: 'Logout' },
];

const ACTION_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default' | 'primary'> = {
  create: 'success',
  delete: 'error',
  void: 'error',
  reject: 'error',
  cancel: 'error',
  deactivate: 'error',
  update: 'primary',
  approve: 'success',
  receive: 'success',
  activate: 'success',
  login: 'success',
  'login-failed': 'error',
  logout: 'default',
};

function actionLabel(action: string): string {
  return action
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** True when every value in `changes` is itself an { old, new } pair — the shape update()/void()/approve()/etc. log, vs. the flat field=>value snapshot create()/delete() log. */
function isDiffShape(changes: Record<string, unknown>): boolean {
  const values = Object.values(changes);
  return values.length > 0 && values.every((v) => v !== null && typeof v === 'object' && ('old' in (v as object) || 'new' in (v as object)));
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface Filters {
  q: string;
  entity_type: string;
  action: string;
  from: string;
  to: string;
  [key: string]: string;
}

const EMPTY_FILTERS: Filters = { q: '', entity_type: '', action: '', from: '', to: '' };

export function AuditTrailScreen() {
  // Draft values track the filter inputs as the user edits them; `applied`
  // is what's actually sent to the API, and only changes when Search is
  // clicked — this screen deliberately does not search as-you-type/filter
  // like every other list in the admin (the activity log can get large
  // enough that firing a query per keystroke or per filter change isn't
  // what you want here).
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [viewing, setViewing] = useState<AuditLog | null>(null);

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, reload } = useList<AuditLog>(
    '/audit-logs',
    applied,
    hasSearched
  );

  useEffect(() => {
    api.get<string[]>('/audit-logs/entity-types').then(setEntityTypes);
  }, []);

  function search() {
    setApplied(draft);
    setHasSearched(true);
  }

  const columns: Column<AuditLog>[] = [
    { key: 'created_at', label: 'Date', sortKey: 'created_at', render: (r) => r.created_at.slice(0, 16).replace('T', ' ') },
    { key: 'user_name', label: 'User', render: (r) => r.user_name ?? 'System' },
    {
      key: 'action',
      label: 'Action',
      width: 140,
      render: (r) => <Chip size="small" label={actionLabel(r.action)} color={ACTION_COLOR[r.action] ?? 'default'} />,
    },
    { key: 'entity_type', label: 'Entity', render: (r) => r.entity_type },
    { key: 'entity_label', label: 'Record', render: (r) => r.entity_label ?? (r.entity_id ? `#${r.entity_id}` : '—') },
  ];

  const changes = viewing?.changes ?? null;
  const diffShape = changes !== null && isDiffShape(changes);

  return (
    <div>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}>
          <InlineSelectFilter
            label="Entity"
            value={draft.entity_type}
            onChange={(v) => setDraft({ ...draft, entity_type: v })}
            minWidth={160}
            options={[{ value: '', label: 'All Entities' }, ...entityTypes.map((t) => ({ value: t, label: t }))]}
          />
          <InlineSelectFilter
            label="Action"
            value={draft.action}
            onChange={(v) => setDraft({ ...draft, action: v })}
            minWidth={160}
            options={ACTION_OPTIONS}
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              From
            </Typography>
            <TextField
              type="date"
              size="small"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              sx={{ minWidth: 150 }}
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              To
            </Typography>
            <TextField type="date" size="small" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} sx={{ minWidth: 150 }} />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}>
          <SearchField value={draft.q} onChange={(v) => setDraft({ ...draft, q: v })} sx={{ minWidth: 220 }} />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={search}>
            Search
          </Button>
          {hasSearched && (
            <Tooltip title="Refresh">
              <span>
                <IconButton
                  size="small"
                  onClick={reload}
                  disabled={loading}
                  aria-label="Refresh"
                  sx={{
                    flexShrink: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                    animation: loading ? 'spin 0.8s linear infinite' : 'none',
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {!hasSearched ? (
        <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <ManageSearchOutlinedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Set your filters and click Search
          </Typography>
          <Typography variant="body2">The activity log doesn't load until you run a search.</Typography>
        </Stack>
      ) : (
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
        sort={sort}
        onSortChange={setSort}
        emptyLabel="No activity recorded yet."
        rowActions={(r) => (
          <Tooltip title="View">
            <IconButton size="small" aria-label="View" onClick={() => setViewing(r)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />
      )}

      <Modal open={!!viewing} title="Activity Detail" onClose={() => setViewing(null)} compact>
        {viewing && (
          <>
            <DetailView
              dense
              fields={[
                { label: 'Date', value: viewing.created_at.slice(0, 16).replace('T', ' ') },
                { label: 'User', value: viewing.user_name ?? 'System' },
                { label: 'Action', value: actionLabel(viewing.action) },
                { label: 'Entity', value: viewing.entity_type },
                { label: 'Record', value: viewing.entity_label ?? (viewing.entity_id ? `#${viewing.entity_id}` : '—') },
                { label: 'IP Address', value: viewing.ip_address ?? '—' },
              ]}
            />

            {changes && Object.keys(changes).length > 0 ? (
              <Stack sx={{ mt: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {diffShape ? 'What changed' : 'Record snapshot'}
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Field</TableCell>
                        {diffShape ? (
                          <>
                            <TableCell>Before</TableCell>
                            <TableCell>After</TableCell>
                          </>
                        ) : (
                          <TableCell>Value</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(changes).map(([field, value]) => (
                        <TableRow key={field}>
                          <TableCell sx={{ fontWeight: 600 }}>{field}</TableCell>
                          {diffShape ? (
                            <>
                              <TableCell>{formatValue((value as { old: unknown }).old)}</TableCell>
                              <TableCell>{formatValue((value as { new: unknown }).new)}</TableCell>
                            </>
                          ) : (
                            <TableCell>{formatValue(value)}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 2.5 }}>
                No additional details recorded for this entry.
              </Typography>
            )}
          </>
        )}

        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="text" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
