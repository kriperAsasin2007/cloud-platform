import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { InstanceMetric } from '../../types/metrics.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface Props {
  metrics: InstanceMetric[];
  title: string;
  dataKey: keyof Pick<InstanceMetric, 'cpuPercent' | 'memoryMb' | 'networkInKb' | 'networkOutKb'>;
  color?: string;
  unit?: string;
}

const OPTIONS: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#94a3b8',
      bodyColor: '#f1f5f9',
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: '#f1f5f9' },
      ticks: { color: '#94a3b8', maxTicksLimit: 6, font: { size: 11 } },
    },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: { color: '#94a3b8', font: { size: 11 } },
      beginAtZero: true,
    },
  },
};

export function MetricsLineChart({ metrics, title, dataKey, color = '#2563EB', unit = '' }: Props) {
  const sorted = [...metrics].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  const labels = sorted.map((m) =>
    new Date(m.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );

  const data = {
    labels,
    datasets: [
      {
        data: sorted.map((m) => Number(m[dataKey])),
        borderColor: color,
        backgroundColor: `${color}18`,
        borderWidth: 2,
        pointRadius: sorted.length > 20 ? 0 : 3,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const opts = {
    ...OPTIONS,
    plugins: {
      ...OPTIONS.plugins,
      tooltip: {
        ...OPTIONS.plugins?.tooltip,
        callbacks: {
          label: (ctx: any) => `${ctx.parsed.y}${unit}`,
        },
      },
    },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</p>
      <div className="h-36">
        {sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No data yet
          </div>
        ) : (
          <Line data={data} options={opts as any} />
        )}
      </div>
    </div>
  );
}
