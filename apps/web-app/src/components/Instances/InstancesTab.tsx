import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInstances } from '../../hooks/useInstances';
import { terminateInstance } from '../../api/instances.api';
import { InstanceRow } from './InstanceRow';
import { CreateInstanceModal } from './CreateInstanceModal';
import { InstanceDetailsModal } from './InstanceDetailsModal';
import { GlobalMetricsTab } from './GlobalMetricsTab';
import type { Instance } from '../../types/instance.types';

type InnerTab = 'general' | 'metrics';

export function InstancesTab() {
  const { user } = useAuth();
  const { instances, loading, error, refetch, addOptimistic } = useInstances(user?.userId ?? null);
  const [innerTab, setInnerTab] = useState<InnerTab>('general');
  const [showCreate, setShowCreate] = useState(false);
  const [detailInstance, setDetailInstance] = useState<Instance | null>(null);
  async function handleTerminate(instance: Instance) {
    if (!confirm(`Terminate instance ${instance.id.slice(0, 8)}?`)) return;
    await terminateInstance(instance.id);
  }

  const active = instances.filter((i) => i.status !== 'TERMINATED');
  const running = instances.filter((i) => i.status === 'RUNNING').length;

  return (
    <div className="flex flex-col h-full">
      {/* Inner tabs */}
      <div className="flex items-center gap-1 px-6 pt-6 border-b border-slate-200 bg-white">
        {(['general', 'metrics'] as InnerTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setInnerTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors capitalize ${
              innerTab === tab
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'general' ? 'General' : 'Metrics'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {innerTab === 'metrics' ? (
          <GlobalMetricsTab />
        ) : (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Instances</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {running} running · {active.length} total active
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refetch}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
                  title="Refresh"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Launch Instance
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading && instances.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400">
                <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading instances…
              </div>
            ) : instances.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white border border-slate-200 rounded-2xl">
                <svg className="w-14 h-14 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <p className="text-slate-600 font-medium">No instances yet</p>
                <p className="text-sm mt-1">Launch your first instance to get started.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Launch Instance
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-visible">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50">
                      {['ID', 'Status', 'Image', 'CPU', 'Memory', 'IP / Port', 'Created', ''].map((h, i, arr) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 ${
                            i === 0 ? 'rounded-tl-2xl' : i === arr.length - 1 ? 'rounded-tr-2xl' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {instances.map((inst) => (
                      <InstanceRow
                        key={inst.id}
                        instance={inst}
                        onInfo={setDetailInstance}
                        onTerminate={handleTerminate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateInstanceModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            addOptimistic(id);
            setShowCreate(false);
          }}
        />
      )}

      {detailInstance && (
        <InstanceDetailsModal
          instance={detailInstance}
          onClose={() => setDetailInstance(null)}
        />
      )}
    </div>
  );
}
