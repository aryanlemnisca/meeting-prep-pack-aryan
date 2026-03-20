'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BlocklistForm({ entries }: { entries: { id: string; titlePattern: string }[] }) {
  const [newPattern, setNewPattern] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newPattern.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titlePattern: newPattern }),
      });
      setNewPattern('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/blocklist/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
          placeholder="Meeting title to block..."
          className="flex-1 max-w-md rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#00BFFF] focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newPattern.trim()}
          className="rounded-md bg-[#00BFFF] px-4 py-2 text-sm text-black font-medium hover:bg-[#0EA5E9] disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No entries yet.</p>
      ) : (
        <table className="w-full">
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className="border-b border-gray-800">
                <td className="py-3 text-sm text-gray-300">{entry.titlePattern}</td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
