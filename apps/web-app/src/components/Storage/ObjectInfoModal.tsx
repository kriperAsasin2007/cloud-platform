import { useEffect, useState } from 'react';
import { storageApi } from '../../api/storage.api';
import type { ObjectStat } from '../../types/storage.types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

interface Props {
  bucket: string;
  objectKey: string;
  onClose: () => void;
}

export function ObjectInfoModal({ bucket, objectKey, onClose }: Props) {
  const [stat, setStat] = useState<ObjectStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filename = objectKey.split('/').pop() ?? objectKey;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    storageApi
      .statObject(bucket, objectKey)
      .then(setStat)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load object info'))
      .finally(() => setLoading(false));
  }, [bucket, objectKey]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await storageApi.downloadObject(bucket, objectKey);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  const userMeta = stat ? Object.entries({ ...stat.metadata }).filter(([k]) => !k.startsWith('x-amz')) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">{filename}</h2>
            <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{objectKey}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition ml-3 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading…
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
          ) : stat ? (
            <div className="space-y-5">
              {/* Core properties */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">File Info</h3>
                <dl className="space-y-2">
                  {[
                    { label: 'Size', value: formatBytes(stat.size) },
                    { label: 'Content Type', value: stat.contentType },
                    { label: 'Last Modified', value: formatDate(stat.lastModified) },
                    { label: 'ETag', value: <span className="font-mono text-xs break-all">{stat.etag}</span> },
                    { label: 'Bucket', value: bucket },
                    { label: 'Full Key', value: <span className="font-mono text-xs break-all">{objectKey}</span> },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-4">
                      <dt className="text-sm text-slate-500 w-32 shrink-0">{label}</dt>
                      <dd className="text-sm text-slate-700 font-medium flex-1">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Custom metadata */}
              {userMeta.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Custom Metadata</h3>
                  <dl className="space-y-2">
                    {userMeta.map(([k, v]) => (
                      <div key={k} className="flex gap-4">
                        <dt className="text-sm text-slate-500 w-32 shrink-0 font-mono">{k}</dt>
                        <dd className="text-sm text-slate-700 flex-1 break-all">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Close
          </button>
          {stat && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
            >
              {downloading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
