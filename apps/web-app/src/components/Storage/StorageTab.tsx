import { useState } from 'react';
import { StorageBrowser } from './StorageBrowser';
import { StorageMetricsTab } from './StorageMetricsTab';

type InnerTab = 'browser' | 'metrics';

export function StorageTab() {
  const [innerTab, setInnerTab] = useState<InnerTab>('browser');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-6 pt-6 border-b border-slate-200 bg-white">
        {([
          { id: 'browser', label: 'Browser' },
          { id: 'metrics', label: 'Metrics' },
        ] as { id: InnerTab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setInnerTab(id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              innerTab === id
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {innerTab === 'metrics' ? <StorageMetricsTab /> : <StorageBrowser />}
      </div>
    </div>
  );
}
