import type { InstanceStatus } from '../../types/instance.types';

const CONFIG: Record<InstanceStatus, { label: string; className: string; dot: string }> = {
  PENDING:      { label: 'Pending',      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-400' },
  SCHEDULING:   { label: 'Scheduling',   className: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-400' },
  PROVISIONING: { label: 'Provisioning', className: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500 animate-pulse' },
  RUNNING:      { label: 'Running',      className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  TERMINATING:  { label: 'Terminating',  className: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-400 animate-pulse' },
  TERMINATED:   { label: 'Terminated',   className: 'bg-slate-50 text-slate-500 border-slate-200',     dot: 'bg-slate-400' },
  FAILED:       { label: 'Failed',       className: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-500' },
};

export function StatusBadge({ status }: { status: InstanceStatus }) {
  const { label, className, dot } = CONFIG[status] ?? CONFIG['FAILED'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
