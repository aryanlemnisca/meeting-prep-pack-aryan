'use client';
import { useState, useEffect } from 'react';
import { Spinner } from './spinner';

interface LinkedInUrlInputProps {
  contactId: string;
  contactName: string;
  onSubmit?: () => void;
}

const SCRAPE_STEPS = [
  'Submitting to scraper...',
  'Scraping LinkedIn profile...',
  'Processing profile data...',
  'Building contact profile...',
];

export function LinkedInUrlInput({ contactId, contactName, onSubmit }: LinkedInUrlInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStepIndex(prev => (prev < SCRAPE_STEPS.length - 1 ? prev + 1 : prev));
    }, 8000);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStepIndex(0);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to scrape profile');
      } else {
        setDone(true);
        onSubmit?.();
      }
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 mt-2 animate-fade-in">
        <span className="text-green-400">✓</span>
        <span className="text-sm text-green-400">Profile created for {contactName}</span>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={`LinkedIn URL for ${contactName}`}
          className="flex-1 rounded-md border border-[#374151] bg-[#1F2937] px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-[#00BFFF] focus:outline-none transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center gap-2 rounded-md bg-[#00BFFF] px-3 py-1.5 text-sm text-black font-medium hover:bg-[#0EA5E9] disabled:opacity-50 transition-colors"
        >
          {loading && <Spinner size="sm" className="text-black" />}
          {loading ? 'Scraping...' : 'Add'}
        </button>
      </form>
      {loading && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-[#00BFFF] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${((stepIndex + 1) / SCRAPE_STEPS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">{SCRAPE_STEPS[stepIndex]}</span>
        </div>
      )}
      {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
    </div>
  );
}
