import { useEffect, useRef, useState } from 'react';
import { storageApi } from '../../api/storage.api';

const BUCKET_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateBucketModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function validate(value: string): string | null {
    if (value.length < 3) return 'Bucket name must be at least 3 characters.';
    if (value.length > 63) return 'Bucket name must be 63 characters or fewer.';
    if (!BUCKET_RE.test(value)) return 'Use only lowercase letters, digits, and hyphens. Must start and end with a letter or digit.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate(name.trim());
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      await storageApi.createBucket(name.trim());
      onCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create bucket';
      setError(msg.includes('409') || msg.toLowerCase().includes('already') ? `Bucket "${name}" already exists.` : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Create Bucket</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bucket Name
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value.toLowerCase()); setError(null); }}
              placeholder="my-bucket"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              3–63 characters. Lowercase letters, digits, and hyphens only. Must start and end with a letter or digit.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || name.trim().length < 3}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              Create Bucket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
