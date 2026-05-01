import { useCallback, useEffect, useRef, useState } from 'react';
import { storageApi } from '../../api/storage.api';

interface FileEntry {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

interface Props {
  bucket: string;
  currentPrefix: string;
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadFilesModal({ bucket, currentPrefix, onClose, onUploaded }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !uploading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, uploading]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newEntries: FileEntry[] = Array.from(files).map((f) => ({
      file: f,
      status: 'pending',
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  }

  function removeFile(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  }, []);

  async function handleUpload() {
    if (entries.length === 0) return;
    setUploading(true);

    const upload = async (entry: FileEntry, index: number) => {
      setEntries((prev) =>
        prev.map((e, i) => (i === index ? { ...e, status: 'uploading' } : e)),
      );
      try {
        const key = currentPrefix + entry.file.name;
        await storageApi.uploadObject(bucket, entry.file, key);
        setEntries((prev) =>
          prev.map((e, i) => (i === index ? { ...e, status: 'done' } : e)),
        );
      } catch (err: unknown) {
        setEntries((prev) =>
          prev.map((e, i) =>
            i === index
              ? { ...e, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
              : e,
          ),
        );
      }
    };

    // Upload up to 3 files concurrently
    const CONCURRENCY = 3;
    for (let i = 0; i < entries.length; i += CONCURRENCY) {
      await Promise.all(
        entries.slice(i, i + CONCURRENCY).map((e, offset) => upload(e, i + offset)),
      );
    }

    setUploading(false);
    const allDone = entries.every((e) => e.status === 'done' || e.status === 'error');
    const anyDone = entries.some((e) => e.status === 'done');
    if (allDone && anyDone) {
      setTimeout(onUploaded, 600);
    }
  }

  const pending = entries.filter((e) => e.status === 'pending').length;
  const done = entries.filter((e) => e.status === 'done').length;
  const errored = entries.filter((e) => e.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Upload Files</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Destination: <span className="font-mono">{bucket}/{currentPrefix || ''}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm font-medium text-slate-600">
              Drag & drop files here or <span className="text-blue-600">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Select multiple files at once</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {entries.length > 0 && (
            <div className="space-y-1.5">
              {entries.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg"
                >
                  {/* Status icon */}
                  <div className="shrink-0">
                    {entry.status === 'pending' && (
                      <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {entry.status === 'uploading' && (
                      <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    )}
                    {entry.status === 'done' && (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {entry.status === 'error' && (
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{entry.file.name}</p>
                    {entry.error ? (
                      <p className="text-xs text-red-500">{entry.error}</p>
                    ) : (
                      <p className="text-xs text-slate-400">{formatBytes(entry.file.size)}</p>
                    )}
                  </div>

                  {entry.status === 'pending' && !uploading && (
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 rounded text-slate-300 hover:text-red-400 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {uploading || done > 0 || errored > 0 ? (
            <p className="text-xs text-center text-slate-500">
              {done > 0 && <span className="text-emerald-600 font-medium">{done} uploaded</span>}
              {done > 0 && errored > 0 && ' · '}
              {errored > 0 && <span className="text-red-500 font-medium">{errored} failed</span>}
              {uploading && pending > 0 && ` · ${pending} remaining`}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || entries.filter((e) => e.status === 'pending').length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
          >
            {uploading && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {uploading ? 'Uploading…' : `Upload ${entries.filter((e) => e.status === 'pending').length} File${entries.filter((e) => e.status === 'pending').length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
