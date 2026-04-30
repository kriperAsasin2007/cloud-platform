import { useState, type FormEvent } from 'react';
import { createInstance } from '../../api/instances.api';
import type { CreateInstanceRequest } from '../../types/instance.types';

interface Props {
  onClose: () => void;
  onCreated: (instanceId: string) => void;
}

const IMAGE_TYPES = ['ubuntu', 'debian', 'alpine', 'centos'];

export function CreateInstanceModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateInstanceRequest>({
    cpu: 500,
    memory: 512,
    imageType: 'ubuntu',
    sshPublicKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof CreateInstanceRequest>(k: K, v: CreateInstanceRequest[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { instanceId } = await createInstance(form);
      onCreated(instanceId);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create instance');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Launch Instance</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CPU (millicores)
              </label>
              <input
                type="number"
                min={100}
                max={4000}
                step={100}
                value={form.cpu}
                onChange={(e) => set('cpu', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">{(form.cpu / 1000).toFixed(1)} vCPU</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Memory (MB)
              </label>
              <input
                type="number"
                min={128}
                max={8192}
                step={128}
                value={form.memory}
                onChange={(e) => set('memory', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">{(form.memory / 1024).toFixed(2)} GB</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image Type</label>
            <select
              value={form.imageType}
              onChange={(e) => set('imageType', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {IMAGE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SSH Public Key</label>
            <textarea
              rows={3}
              value={form.sshPublicKey}
              onChange={(e) => set('sshPublicKey', e.target.value)}
              placeholder="ssh-rsa AAAA..."
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition"
            >
              {loading ? 'Launching…' : 'Launch Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
