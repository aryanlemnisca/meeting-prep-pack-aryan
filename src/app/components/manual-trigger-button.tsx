'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingOverlay } from './spinner';

const STEPS = [
  'Fetching Gmail threads...',
  'Searching past meeting notes...',
  'Researching participants...',
  'Assembling context...',
  'Generating prep pack with AI...',
  'Rendering email template...',
  'Sending prep email...',
  'Almost done...',
];

export function ManualTriggerButton({ meetingId, currentStatus }: { meetingId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStepIndex(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleTrigger() {
    setLoading(true);
    setStepIndex(0);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/generate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Generation failed');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <LoadingOverlay message={STEPS[stepIndex]} />}
      <button
        onClick={handleTrigger}
        disabled={loading}
        className="rounded-md bg-[#00BFFF] px-4 py-2 text-sm text-black font-medium hover:bg-[#0EA5E9] disabled:opacity-50 transition-colors"
      >
        Generate Prep Pack
      </button>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </>
  );
}
