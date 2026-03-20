'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddContactNote({ contactId }: { contactId: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, noteType: 'general' }),
      });
      setContent('');
      router.refresh();
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF] focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="rounded-md bg-[#00BFFF] px-4 py-2 text-sm font-medium text-black hover:bg-[#0EA5E9] disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Add'}
        </button>
      </div>
    </form>
  );
}
