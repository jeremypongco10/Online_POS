import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ApiEnvelope } from '../api/types';

type Meta = ApiEnvelope<unknown>['meta'];

/**
 * Fetches one page of a paginated, searchable, filterable admin list —
 * the same shape every BaseCrudController::index() endpoint returns.
 * `params` merges in as extra query params (e.g. { category_id }) and
 * re-fetches whenever it changes.
 */
export function useList<T>(endpoint: string, params: Record<string, string | number | undefined> = {}) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState('');
  const [q, setQ] = useState('');

  const paramsKey = JSON.stringify(params);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (q.trim()) query.set('q', q.trim());
    if (sort) query.set('sort', sort);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }

    api
      .getPaged<T>(`${endpoint}?${query.toString()}`)
      .then((res) => {
        setData(res.data);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, perPage, sort, q, paramsKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  // A filter/search/sort/page-size change should snap back to page 1, not
  // stay on whatever deep page the user was previously viewing.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, perPage, paramsKey]);

  return { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload };
}
