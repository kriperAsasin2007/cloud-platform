import { useEffect, useState } from 'react';
import { storageApi } from '../../api/storage.api';
import type { StorageMetrics } from '../../types/storage.types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

export function StorageMetricsTab() {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await storageApi.getStorageMetrics();
      setMetrics(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading metrics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!metrics) return null;

  const maxSize = Math.max(...metrics.buckets.map((b) => b.totalSizeBytes), 1);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Storage Metrics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Live data from MinIO</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Buckets', value: metrics.totalBuckets, unit: '', color: 'text-blue-700' },
          { label: 'Total Objects', value: metrics.totalObjects, unit: '', color: 'text-violet-700' },
          { label: 'Total Storage', value: formatBytes(metrics.totalSizeBytes), unit: '', color: 'text-emerald-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}{s.unit}</p>
          </div>
        ))}
      </div>

      {/* Per-bucket breakdown */}
      {metrics.buckets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-white border border-slate-200 rounded-2xl">
          <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
          </svg>
          <p className="text-sm">No buckets yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Per-Bucket Breakdown</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {[...metrics.buckets]
              .sort((a, b) => b.totalSizeBytes - a.totalSizeBytes)
              .map((b) => (
                <div key={b.name} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-700">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{b.objectCount} object{b.objectCount !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-slate-700">{formatBytes(b.totalSizeBytes)}</span>
                    </div>
                  </div>
                  {/* Size bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(b.totalSizeBytes / maxSize) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
