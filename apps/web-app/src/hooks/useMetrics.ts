import { useEffect, useState, useCallback } from 'react';
import { getInstanceMetrics, getMyMetrics } from '../api/metrics.api';
import type { InstanceMetric } from '../types/metrics.types';

export function useInstanceMetrics(instanceId: string | null) {
  const [metrics, setMetrics] = useState<InstanceMetric[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!instanceId) return;
    setLoading(true);
    try {
      const data = await getInstanceMetrics(instanceId);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { metrics, loading, refetch: fetch };
}

export function useMyMetrics() {
  const [metrics, setMetrics] = useState<InstanceMetric[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyMetrics();
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { metrics, loading, refetch: fetch };
}
