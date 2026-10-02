import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ApiEnvelope } from '../api/types';

type Meta = ApiEnvelope<unknown>['meta'];

/** How long to wait after the last keystroke before a server search actually fires. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Fetches one page of a paginated, searchable, filterable admin list — the
 * same shape every BaseCrudController::index() endpoint returns. `params`
 * merges in as extra query params (e.g. { category_id }) and re-fetches
 * whenever it changes.
 *
 * `enabled` (default true) gates whether that auto-fetch actually runs —
 * a screen that wants an explicit "Search" button instead of the usual
 * as-you-type/as-you-filter behavior passes `enabled: false` until the
 * button is first clicked (see AuditTrailScreen).
 *
 * `searchMode` picks how `q` behaves:
 * - 'server' (default) — sent to the server, so it correctly searches the
 *   *entire* list, not just the page already loaded. The request itself
 *   is debounced (waits SEARCH_DEBOUNCE_MS after the last keystroke), so
 *   typing a whole name fires one request, not one per character. Use
 *   this for anything that can genuinely grow large — Products,
 *   Customers, Inventory, Suppliers, Purchase Orders, Returns.
 * - 'client' — filtered locally against whatever's already loaded, no
 *   request at all, no debounce needed. Only correct for a list that's
 *   always small enough to fit on one page in practice — Stores,
 *   Registers, Roles, Payment Methods, Tax Rates, Units. Wrong choice
 *   here means search silently misses rows sitting on a page that was
 *   never fetched.
 *
 * `extraSearchText`, 'client' mode only: text to search in addition to a
 * row's own field values — for a row whose only useful match on a related
 * name is a foreign id. A Register carries `store_id`, not the store's
 * name, so typing a store name into the search box would otherwise match
 * nothing despite the table visibly showing which store every row
 * belongs to (see RegistersTab).
 */
export function useList<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  enabled = true,
  searchMode: 'server' | 'client' = 'server',
  extraSearchText?: (row: T) => string
) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sort, setSort] = useState('');
  const [q, setQ] = useState('');
  // Stays '' forever in 'client' mode (the effect below only runs for
  // 'server'), which is exactly what's wanted: it's only ever read when
  // building the server query or the page-reset deps, neither of which
  // 'client' mode should react to at all.
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    if (searchMode !== 'server') return;
    const timer = setTimeout(() => setDebouncedQ(q), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, searchMode]);

  const paramsKey = JSON.stringify(params);

  // Guards against an older request's response landing after a newer
  // one's (out-of-order network timing) and clobbering fresher results
  // with stale ones — every response checks it's still the most recent
  // request before touching state at all.
  const requestIdRef = useRef(0);

  const reload = useCallback(() => {
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (searchMode === 'server' && debouncedQ.trim()) query.set('q', debouncedQ.trim());
    if (sort) query.set('sort', sort);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }

    api
      .getPaged<T>(`${endpoint}?${query.toString()}`)
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        setData(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, perPage, sort, debouncedQ, paramsKey, enabled, searchMode]);

  useEffect(() => {
    reload();
  }, [reload]);

  // A filter/search/sort/page-size change should snap back to page 1, not
  // stay on whatever deep page the user was previously viewing. In
  // 'client' mode debouncedQ never changes, so this only ever reacts to
  // sort/perPage/params there — exactly right, since a client-side filter
  // has no "page" of its own to reset.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, sort, perPage, paramsKey]);

  const needle = q.trim().toLowerCase();
  const filteredData = useMemo(() => {
    if (searchMode !== 'client' || !needle) return data;

    return data.filter((row) => {
      const ownFieldsMatch = Object.values(row as Record<string, unknown>).some(
        (value) => (typeof value === 'string' || typeof value === 'number') && String(value).toLowerCase().includes(needle)
      );
      if (ownFieldsMatch) return true;
      return extraSearchText !== undefined && extraSearchText(row).toLowerCase().includes(needle);
    });
    // extraSearchText is deliberately a dependency, not omitted like
    // `reload`'s callback below — callers pass a fresh closure every
    // render (RegistersTab's closes over `stores`, loaded async after
    // mount), and recomputing this filter over a client-mode list's
    // always-small row count costs nothing.
  }, [data, needle, searchMode, extraSearchText]);

  // The pagination footer's "X–Y of Z" has to describe what's actually on
  // screen. While client-side searching, that's the filtered count on
  // this one loaded page — the real server total would just read as
  // wrong next to a visibly shorter table. Server mode never touches
  // this: meta is already correct as the server returned it.
  const filteredMeta = useMemo(() => {
    if (searchMode !== 'client' || !meta || !needle) return meta;

    return { ...meta, total: filteredData.length };
  }, [meta, needle, filteredData.length, searchMode]);

  return {
    data: filteredData,
    meta: filteredMeta,
    loading,
    error,
    page,
    setPage,
    perPage,
    setPerPage,
    sort,
    setSort,
    q,
    setQ,
    reload,
  };
}
