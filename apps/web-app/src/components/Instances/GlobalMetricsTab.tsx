import { useMyMetrics } from '../../hooks/useMetrics';
import { MetricsLineChart } from '../Charts/MetricsLineChart';

export function GlobalMetricsTab() {
  const { metrics, loading } = useMyMetrics();

  if (loading && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading metrics…
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">No metrics available yet.</p>
        <p className="text-xs mt-1">Start a running instance to see data.</p>
      </div>
    );
  }

  const uniqueInstances = [...new Set(metrics.map((m) => m.instanceId))];

  const avgCpu = (metrics.reduce((s, m) => s + Number(m.cpuPercent), 0) / metrics.length).toFixed(1);
  const avgMem = Math.round(metrics.reduce((s, m) => s + m.memoryMb, 0) / metrics.length);
  const totalIn = metrics.reduce((s, m) => s + m.networkInKb, 0);
  const totalOut = metrics.reduce((s, m) => s + m.networkOutKb, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Monitored Instances', value: uniqueInstances.length, unit: '' },
          { label: 'Avg CPU', value: avgCpu, unit: '%' },
          { label: 'Avg Memory', value: avgMem, unit: ' MB' },
          { label: 'Total Data Points', value: metrics.length, unit: '' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-blue-700">{s.value}{s.unit}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricsLineChart metrics={metrics} title="CPU % (all instances)" dataKey="cpuPercent" unit="%" />
        <MetricsLineChart metrics={metrics} title="Memory MB (all instances)" dataKey="memoryMb" color="#7c3aed" unit=" MB" />
        <MetricsLineChart metrics={metrics} title="Network In KB" dataKey="networkInKb" color="#059669" unit=" KB" />
        <MetricsLineChart metrics={metrics} title="Network Out KB" dataKey="networkOutKb" color="#d97706" unit=" KB" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Network In</p>
          <p className="text-xl font-bold text-emerald-600">{(totalIn / 1024).toFixed(2)} MB</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Network Out</p>
          <p className="text-xl font-bold text-amber-600">{(totalOut / 1024).toFixed(2)} MB</p>
        </div>
      </div>
    </div>
  );
}
