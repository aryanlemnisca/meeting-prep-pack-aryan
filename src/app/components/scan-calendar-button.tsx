'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from './spinner';

export function ScanCalendarButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; updated: number; removed: number; skipped: number; totalEvents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleScan() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/scan-calendar', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Scan failed');
        return;
      }

      setResult(data);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleScan}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-[#00BFFF] px-4 py-2 text-sm font-medium text-black hover:bg-[#0EA5E9] disabled:opacity-70 transition-colors"
      >
        {loading && <Spinner size="sm" className="text-black" />}
        {loading ? 'Scanning calendar...' : 'Scan Calendar'}
      </button>

      {result && (
        <span className="text-sm text-gray-400 animate-fade-in">
          Found {result.totalEvents} events — {result.added} added{result.updated > 0 ? `, ${result.updated} updated` : ''}{result.removed > 0 ? `, ${result.removed} removed` : ''}, {result.skipped} unchanged
        </span>
      )}

      {error && (
        <span className="text-sm text-red-400 animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
}
