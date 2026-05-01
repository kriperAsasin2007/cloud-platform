import { useState, useRef, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import type { Instance } from '../../types/instance.types';

interface Props {
  instance: Instance;
  onInfo: (instance: Instance) => void;
  onTerminate: (instance: Instance) => void;
}

export function InstanceRow({ instance, onInfo, onTerminate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const canTerminate = !['TERMINATING', 'TERMINATED', 'FAILED'].includes(instance.status);

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {instance.id.slice(0, 8)}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={instance.status} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">{instance.imageType}</td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {(instance.cpuMillicores / 1000).toFixed(1)} vCPU
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{instance.memoryMb} MB</td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {instance.ip ?? '—'}
        {instance.sshPort ? `:${instance.sshPort}` : ''}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {new Date(instance.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onInfo(instance)}
            title="Instance details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title="More actions"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44">
                <button
                  onClick={() => { setMenuOpen(false); onInfo(instance); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Details
                </button>
                <button
                  disabled={!canTerminate}
                  onClick={() => { setMenuOpen(false); onTerminate(instance); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Terminate
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
