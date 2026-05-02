import { useCallback, useEffect, useState } from 'react';
import { storageApi } from '../../api/storage.api';
import type { Bucket, BucketStats, ObjectItem } from '../../types/storage.types';
import { CreateBucketModal } from './CreateBucketModal';
import { CreateFolderModal } from './CreateFolderModal';
import { UploadFilesModal } from './UploadFilesModal';
import { ObjectInfoModal } from './ObjectInfoModal';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getDisplayName(key: string, prefix: string): string {
  const stripped = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  return stripped.replace(/\/$/, '') || key;
}

interface BreadcrumbItem {
  label: string;
  bucket: string | null;
  prefix: string;
}

const Spinner = () => (
  <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

// ── Icons ─────────────────────────────────────────────────────────────────────

const FolderIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

const FileIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BucketIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export function StorageBrowser() {
  const [currentBucket, setCurrentBucket] = useState<string | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState('');

  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [bucketStats, setBucketStats] = useState<Record<string, BucketStats>>({});
  const [objects, setObjects] = useState<ObjectItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [infoObjectKey, setInfoObjectKey] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bkts, metrics] = await Promise.all([
        storageApi.listBuckets(),
        storageApi.getStorageMetrics().catch(() => null),
      ]);
      setBuckets(bkts);
      if (metrics) {
        const statsMap: Record<string, BucketStats> = {};
        metrics.buckets.forEach((s) => { statsMap[s.name] = s; });
        setBucketStats(statsMap);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load buckets');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadObjects = useCallback(async (bucket: string, prefix: string) => {
    setLoading(true);
    setError(null);
    try {
      const items = await storageApi.listObjects(bucket, prefix || undefined, false);
      setObjects(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load objects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentBucket === null) {
      loadBuckets();
    } else {
      loadObjects(currentBucket, currentPrefix);
    }
  }, [currentBucket, currentPrefix, loadBuckets, loadObjects]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navigate(bucket: string | null, prefix: string) {
    setCurrentBucket(bucket);
    setCurrentPrefix(prefix);
    setObjects([]);
  }

  function openBucket(name: string) {
    navigate(name, '');
  }

  function openFolder(key: string) {
    const folderPrefix = key.endsWith('/') ? key : `${key}/`;
    navigate(currentBucket, folderPrefix);
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Storage', bucket: null, prefix: '' },
    ...(currentBucket
      ? [
          { label: currentBucket, bucket: currentBucket, prefix: '' },
          ...currentPrefix
            .split('/')
            .filter(Boolean)
            .map((segment, i, parts) => ({
              label: segment,
              bucket: currentBucket,
              prefix: parts.slice(0, i + 1).join('/') + '/',
            })),
        ]
      : []),
  ];

  // ── Delete handlers ────────────────────────────────────────────────────────

  async function handleDeleteBucket(name: string) {
    const stats = bucketStats[name];
    const objectCount = stats?.objectCount ?? 0;
    const confirmMsg =
      objectCount > 0
        ? `Delete bucket "${name}" and all ${objectCount} object(s) inside? This cannot be undone.`
        : `Delete bucket "${name}"?`;
    if (!confirm(confirmMsg)) return;
    try {
      await storageApi.deleteBucket(name);
      loadBuckets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete bucket');
    }
  }

  async function handleDeleteObject(key: string) {
    const name = getDisplayName(key, currentPrefix);
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await storageApi.deleteObject(currentBucket!, key);
      loadObjects(currentBucket!, currentPrefix);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete object');
    }
  }

  async function handleDownload(key: string) {
    try {
      await storageApi.downloadObject(currentBucket!, key);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  function refresh() {
    if (currentBucket === null) loadBuckets();
    else loadObjects(currentBucket, currentPrefix);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const insideBucket = currentBucket !== null;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300">/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-slate-700">{crumb.label}</span>
            ) : (
              <button
                onClick={() => navigate(crumb.bucket, crumb.prefix)}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                {crumb.label}
              </button>
            )}
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {insideBucket ? currentBucket : 'Storage'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {insideBucket
              ? currentPrefix
                ? `Path: ${currentPrefix}`
                : 'Bucket root'
              : `${buckets.length} bucket${buckets.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {insideBucket ? (
            <>
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
              >
                <FolderIcon />
                New Folder
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowCreateBucket(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Bucket
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Table */}
      {loading && (insideBucket ? objects.length === 0 : buckets.length === 0) ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <Spinner />
          Loading…
        </div>
      ) : !insideBucket ? (
        <BucketTable
          buckets={buckets}
          stats={bucketStats}
          onOpen={openBucket}
          onDelete={handleDeleteBucket}
          onCreateFirst={() => setShowCreateBucket(true)}
        />
      ) : (
        <ObjectTable
          objects={objects}
          prefix={currentPrefix}
          onOpenFolder={openFolder}
          onDownload={handleDownload}
          onDelete={handleDeleteObject}
          onInfo={(key) => setInfoObjectKey(key)}
          onUploadFirst={() => setShowUpload(true)}
        />
      )}

      {/* Modals */}
      {showCreateBucket && (
        <CreateBucketModal
          onClose={() => setShowCreateBucket(false)}
          onCreated={() => { setShowCreateBucket(false); loadBuckets(); }}
        />
      )}

      {showCreateFolder && currentBucket && (
        <CreateFolderModal
          bucket={currentBucket}
          currentPrefix={currentPrefix}
          onClose={() => setShowCreateFolder(false)}
          onCreated={() => { setShowCreateFolder(false); loadObjects(currentBucket, currentPrefix); }}
        />
      )}

      {showUpload && currentBucket && (
        <UploadFilesModal
          bucket={currentBucket}
          currentPrefix={currentPrefix}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadObjects(currentBucket, currentPrefix); }}
        />
      )}

      {infoObjectKey && currentBucket && (
        <ObjectInfoModal
          bucket={currentBucket}
          objectKey={infoObjectKey}
          onClose={() => setInfoObjectKey(null)}
        />
      )}
    </div>
  );
}

// ── Bucket Table ──────────────────────────────────────────────────────────────

function BucketTable({
  buckets,
  stats,
  onOpen,
  onDelete,
  onCreateFirst,
}: {
  buckets: Bucket[];
  stats: Record<string, BucketStats>;
  onOpen: (name: string) => void;
  onDelete: (name: string) => void;
  onCreateFirst: () => void;
}) {
  if (buckets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white border border-slate-200 rounded-2xl">
        <BucketIcon className="w-14 h-14 mb-4 text-slate-300" />
        <p className="text-slate-600 font-medium">No buckets yet</p>
        <p className="text-sm mt-1">Create your first bucket to start storing files.</p>
        <button
          onClick={onCreateFirst}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          New Bucket
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            {['Name', 'Objects', 'Size', 'Created', ''].map((h, i, arr) => (
              <th
                key={h || i}
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
          {buckets.map((b) => {
            const s = stats[b.name];
            return (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3">
                  <button
                    onClick={() => onOpen(b.name)}
                    className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <BucketIcon className="w-4 h-4 text-amber-500" />
                    {b.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {s?.objectCount ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {s ? formatBytes(s.totalSizeBytes) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {formatDate(b.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(b.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                    title="Delete bucket"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Object Table ──────────────────────────────────────────────────────────────

function ObjectTable({
  objects,
  prefix,
  onOpenFolder,
  onDownload,
  onDelete,
  onInfo,
  onUploadFirst,
}: {
  objects: ObjectItem[];
  prefix: string;
  onOpenFolder: (key: string) => void;
  onDownload: (key: string) => void;
  onDelete: (key: string) => void;
  onInfo: (key: string) => void;
  onUploadFirst: () => void;
}) {
  if (objects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white border border-slate-200 rounded-2xl">
        <FolderIcon className="w-14 h-14 mb-4 text-slate-300" />
        <p className="text-slate-600 font-medium">This location is empty</p>
        <p className="text-sm mt-1">Upload files or create a folder to get started.</p>
        <button
          onClick={onUploadFirst}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          Upload Files
        </button>
      </div>
    );
  }

  // Sort: folders first, then files alphabetically
  const sorted = [...objects].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.key.localeCompare(b.key);
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            {['Name', 'Size', 'Last Modified', ''].map((h, i, arr) => (
              <th
                key={h || i}
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
          {sorted.map((item) => {
            const displayName = getDisplayName(item.key, prefix);
            return (
              <tr key={item.key} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3">
                  {item.isDirectory ? (
                    <button
                      onClick={() => onOpenFolder(item.key)}
                      className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <FolderIcon className="w-4 h-4 text-amber-500" />
                      {displayName}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                      <FileIcon className="w-4 h-4 text-slate-400" />
                      {displayName}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {item.isDirectory ? '—' : formatBytes(item.size)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {item.isDirectory ? '—' : formatDate(item.lastModified)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!item.isDirectory && (
                      <>
                        <button
                          onClick={() => onInfo(item.key)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Object info"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDownload(item.key)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onDelete(item.key)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
