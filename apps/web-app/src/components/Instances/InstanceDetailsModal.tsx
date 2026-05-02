import { useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import { MetricsLineChart } from '../Charts/MetricsLineChart';
import { useInstanceMetrics } from '../../hooks/useMetrics';
import type { Instance } from '../../types/instance.types';

interface Props {
  instance: Instance;
  onClose: () => void;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-mono text-slate-800 text-right max-w-[60%] break-all">
        {value ?? '—'}
      </span>
    </div>
  );
}

export function InstanceDetailsModal({ instance, onClose }: Props) {
  const { metrics, loading } = useInstanceMetrics(instance.id);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const latest = metrics[metrics.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 font-mono">
              {instance.id.slice(0, 8)}…
            </h2>
            <div className="mt-1">
              <StatusBadge status={instance.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Configuration
            </h3>
            <div className="bg-slate-50 rounded-xl px-4 py-1">
              <InfoRow label="Instance ID" value={instance.id} />
              <InfoRow label="Image" value={instance.imageType} />
              <InfoRow
                label="CPU"
                value={`${instance.cpuMillicores}mc (${(instance.cpuMillicores / 1000).toFixed(1)} vCPU)`}
              />
              <InfoRow label="Memory" value={`${instance.memoryMb} MB`} />
              <InfoRow
                label="Created"
                value={new Date(instance.createdAt).toLocaleString()}
              />
              {instance.terminatedAt && (
                <InfoRow
                  label="Terminated"
                  value={new Date(instance.terminatedAt).toLocaleString()}
                />
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Network & Access
            </h3>
            <div className="bg-slate-50 rounded-xl px-4 py-1">
              <InfoRow label="IP Address" value={instance.ip} />
              <InfoRow label="SSH Port" value={instance.sshPort} />
              <InfoRow label="Worker Node" value={instance.workerNodeId} />
              <InfoRow
                label="Container ID"
                value={instance.containerId?.slice(0, 12) ?? null}
              />
            </div>
            {instance.ip && instance.sshPort && (
              <div className="mt-2 bg-slate-800 text-emerald-400 text-xs font-mono rounded-lg px-4 py-2.5">
                ssh -i [private-key-path] -p {instance.sshPort} {instance.id}@
                {instance.ip}
              </div>
            )}
            {instance.webUrl && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">
                  Web access (start a server on port 80)
                </p>
                <a
                  href={instance.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-800 text-blue-400 text-xs font-mono rounded-lg px-4 py-2.5 hover:text-blue-300 transition break-all"
                >
                  {instance.webUrl}
                </a>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Metrics
              </h3>
              {loading && (
                <span className="text-xs text-slate-400">Loading…</span>
              )}
            </div>

            {latest && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  {
                    label: 'CPU',
                    value: `${Number(latest.cpuPercent).toFixed(1)}%`,
                  },
                  { label: 'Memory', value: `${latest.memoryMb} MB` },
                  { label: 'Net In', value: `${latest.networkInKb} KB` },
                  { label: 'Net Out', value: `${latest.networkOutKb} KB` },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-blue-50 rounded-xl p-3 text-center"
                  >
                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                    <p className="text-lg font-bold text-blue-700">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetricsLineChart
                metrics={metrics}
                title="CPU %"
                dataKey="cpuPercent"
                unit="%"
              />
              <MetricsLineChart
                metrics={metrics}
                title="Memory MB"
                dataKey="memoryMb"
                color="#7c3aed"
                unit=" MB"
              />
              <MetricsLineChart
                metrics={metrics}
                title="Network In (KB)"
                dataKey="networkInKb"
                color="#059669"
                unit=" KB"
              />
              <MetricsLineChart
                metrics={metrics}
                title="Network Out (KB)"
                dataKey="networkOutKb"
                color="#d97706"
                unit=" KB"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
