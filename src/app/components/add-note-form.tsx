'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddNoteForm({ meetingId }: { meetingId: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await fetch(`/api/meetings/${meetingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, noteType: 'post_meeting' }),
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
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={3}
        className="w-full rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#00BFFF] focus:outline-none"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="mt-2 rounded-md bg-[#00BFFF] px-4 py-2 text-sm text-black font-medium hover:bg-[#0EA5E9] disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Add Note'}
      </button>
    </form>
  );
}
