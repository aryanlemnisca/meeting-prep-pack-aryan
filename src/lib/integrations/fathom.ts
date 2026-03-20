import { searchFathomEmails } from '@/lib/google/gmail';
import type { FathomMeetingNote } from '@/types';

let useGmailFallback = false;

export async function fetchMeetingNotes(participantEmails: string[]): Promise<FathomMeetingNote[]> {
  if (useGmailFallback) {
    return fetchViaGmail(participantEmails);
  }

  try {
    return await fetchViaApi(participantEmails);
  } catch (error: any) {
    // Catch auth errors, DNS failures, network errors — fall back to Gmail
    const msg = error?.message ?? '';
    if (
      error?.status === 401 || error?.status === 403 ||
      msg.includes('401') || msg.includes('403') ||
      msg.includes('fetch failed') || msg.includes('ENOTFOUND')
    ) {
      console.warn('[Fathom] API unavailable, switching to Gmail fallback for this session');
      useGmailFallback = true;
      return fetchViaGmail(participantEmails);
    }
    // Unknown error — still fall back gracefully
    console.error('[Fathom] Unexpected error, falling back to Gmail:', msg);
    useGmailFallback = true;
    return fetchViaGmail(participantEmails);
  }
}

// Path A: Direct Fathom API (https://developers.fathom.ai/api-reference)
async function fetchViaApi(participantEmails: string[]): Promise<FathomMeetingNote[]> {
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) {
    console.warn('[Fathom] No API key configured, using Gmail fallback');
    useGmailFallback = true;
    return fetchViaGmail(participantEmails);
  }

  // Build query params with calendar_invitees[] filter
  const params = new URLSearchParams();
  params.set('include_summary', 'true');
  params.set('include_action_items', 'true');
  for (const email of participantEmails) {
    params.append('calendar_invitees[]', email);
  }

  const response = await fetch(`https://api.fathom.ai/external/v1/meetings?${params.toString()}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error: any = new Error(`Fathom API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const meetings = data.items ?? [];

  return meetings.map((m: any) => ({
    meetingDate: new Date(m.created_at ?? m.scheduled_start_time),
    summary: m.default_summary?.text ?? m.default_summary ?? '',
    actionItems: (m.action_items ?? []).map((ai: any) => ai.text ?? ai.description ?? String(ai)),
    decisions: [],
  }));
}

// Path B: Gmail-based Fathom email extraction
async function fetchViaGmail(participantEmails: string[]): Promise<FathomMeetingNote[]> {
  const notes: FathomMeetingNote[] = [];

  for (const email of participantEmails) {
    try {
      const threads = await searchFathomEmails(email);
      for (const thread of threads) {
        for (const message of thread.messages) {
          notes.push({
            meetingDate: message.date,
            summary: message.body,
            actionItems: [],
            decisions: [],
          });
        }
      }
    } catch (err) {
      console.warn(`[Fathom Gmail] Failed to search for ${email}:`, err);
    }
  }

  return notes;
}
