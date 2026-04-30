import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { listInstances } from '../api/instances.api';
import type { Instance, InstanceStatusEvent } from '../types/instance.types';

const WS_URL = import.meta.env['VITE_WS_URL'] ?? 'http://localhost:3000';

export function useInstances(userId: string | null) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listInstances();
      setInstances(data);
      setError(null);
    } catch {
      setError('Failed to load instances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(WS_URL, { auth: { userId } });
    socketRef.current = socket;

    socket.on('instance:status', (event: InstanceStatusEvent) => {
      setInstances((prev) => {
        const exists = prev.some((i) => i.id === event.instanceId);
        if (!exists) {
          fetchInstances();
          return prev;
        }
        return prev.map((inst) =>
          inst.id === event.instanceId
            ? {
                ...inst,
                status: event.status,
                ...(event.sshPort != null && { sshPort: event.sshPort }),
                ...(event.ip != null && { ip: event.ip }),
              }
            : inst,
        );
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, fetchInstances]);

  const addOptimistic = useCallback((id: string) => {
    setInstances((prev) => [
      {
        id,
        userId: userId ?? '',
        status: 'PENDING',
        cpuMillicores: 0,
        memoryMb: 0,
        imageType: '',
        workerNodeId: null,
        containerId: null,
        sshPort: null,
        ip: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        terminatedAt: null,
      },
      ...prev,
    ]);
  }, [userId]);

  return { instances, loading, error, refetch: fetchInstances, addOptimistic };
}
