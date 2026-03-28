import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface UseCollectionOptions<T> {
  fetchFn: () => Promise<T[]>;
  deps?: unknown[];
}

export function useCollection<T>({ fetchFn, deps = [] }: UseCollectionOptions<T>) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, user, ...deps]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}