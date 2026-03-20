import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ContactProfileSchema, AssembledContext, PrepPack, GmailThreadContext, MaterialLink } from '@/types';
import type { LobstrProfile } from './lobstrio';
import type { TavilySearchResult } from './tavily';
import type { GmailThread } from '@/lib/google/gmail';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

// === 1. Normalize Contact Profile ===
export async function normalizeContactProfile(
  lobstrData: LobstrProfile | null,
  tavilyData: TavilySearchResult | null,
): Promise<ContactProfileSchema> {
  const prompt = `You are a data normalization assistant. Given raw LinkedIn profile data and web search results, produce a clean structured contact profile.

${lobstrData ? `## LinkedIn Data (Lobstr.io)\n${JSON.stringify(lobstrData, null, 2)}` : '## LinkedIn Data\nNot available.'}

${tavilyData ? `## Web Search Results (Tavily)\n${JSON.stringify(tavilyData.results, null, 2)}` : '## Web Search Results\nNot available.'}

Produce a JSON object matching this exact schema:
{
  "name": "string",
  "headline": "string",
  "current_role": "string",
  "current_company": "string",
  "location": "string",
  "about_summary": "string (2-3 sentences condensed from about section)",
  "work_history": [{ "role": "string", "company": "string", "duration": "string", "description_summary": "string" }],
  "education": [{ "institution": "string", "degree": "string", "field": "string", "years": "string" }],
  "key_skills": ["string"],
  "recent_activity_themes": ["string (topics they post/talk about)"],
  "company_context": "string (what their company does, stage, size — from web search)",
  "notable_mentions": ["string (news, talks, articles)"],
  "profile_brief": "string (3-4 sentence narrative summary of who this person is)",
  "data_quality": "rich | moderate | thin"
}

Set data_quality to "rich" if LinkedIn data has full work history, "moderate" if partial, "thin" if mostly unavailable.
Return ONLY valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
}

// === 2. Summarize Gmail Threads ===
export async function summarizeGmailThreads(
  threads: GmailThread[],
  participantEmail: string,
): Promise<GmailThreadContext> {
  if (threads.length === 0) {
    return {
      participantEmail,
      summary: 'No prior email history found.',
      materials: [],
      lastTouchpoint: null,
    };
  }

  const threadData = threads.map(t => ({
    messages: t.messages.map(m => ({
      date: m.date.toISOString(),
      from: m.from,
      subject: m.subject,
      body: m.body.substring(0, 2000), // Truncate long bodies
    })),
  }));

  const prompt = `Analyze these email threads with ${participantEmail} and produce a JSON summary.

## Email Threads
${JSON.stringify(threadData, null, 2)}

Produce a JSON object:
{
  "summary": "string (narrative synthesis of the relationship and key discussions — 3-5 sentences, not a list of emails)",
  "materials": [{ "description": "string", "type": "attachment | doc_link | deck | other", "url": "string or null", "date": "string or null" }],
  "lastTouchpoint": { "date": "ISO date string", "summary": "1-2 sentence summary of most recent interaction" } or null
}

For materials: extract any attachments, document links (Google Docs, Notion, etc.), deck mentions, or shared files referenced in the threads.
Return ONLY valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

  return {
    participantEmail,
    summary: parsed.summary,
    materials: parsed.materials ?? [],
    lastTouchpoint: parsed.lastTouchpoint ? {
      date: new Date(parsed.lastTouchpoint.date),
      summary: parsed.lastTouchpoint.summary,
    } : null,
  };
}

// === 3. Infer Meeting Type ===
export async function inferMeetingType(
  participants: { email: string; name: string; isExternal: boolean }[],
  calendarDescription?: string,
): Promise<string> {
  const prompt = `Based on the meeting participants and description, classify this meeting type.

## Participants
${participants.map(p => `- ${p.name} (${p.email})${p.isExternal ? ' [EXTERNAL]' : ' [INTERNAL]'}`).join('\n')}

## Calendar Description
${calendarDescription ?? 'No description provided.'}

Classify as exactly one of: investor, partner, customer, internal, other

Return ONLY the single word classification, nothing else.`;

  const result = await model.generateContent(prompt);
  const type = result.response.text().trim().toLowerCase();

  const validTypes = ['investor', 'partner', 'customer', 'internal', 'other'];
  return validTypes.includes(type) ? type : 'other';
}

// === 4. Generate Full Prep Pack ===
export async function generatePrepPack(context: AssembledContext): Promise<PrepPack> {
  const prompt = `You are a meeting preparation assistant for Pushkar, founder of Lemnisca (a biotech company). Generate a comprehensive meeting prep pack.

## Meeting Details
- Title: ${context.meeting.title}
- Time: ${context.meeting.startTime.toISOString()}
- Description: ${context.meeting.description ?? 'None'}
- Conference Link: ${context.meeting.conferenceLink ?? 'None'}
- Meeting Mode: ${context.meetingMode}

## Participants
${context.participants.map(p => {
  let info = `- ${p.name} (${p.email})${p.isExternal ? ' [EXTERNAL]' : ' [INTERNAL]'}`;
  if (p.isNewContact) info += ' [FIRST TIME]';
  if (p.profile) info += `\n  Profile: ${p.profile.profile_brief}\n  Role: ${p.profile.current_role} at ${p.profile.current_company}`;
  return info;
}).join('\n')}

## Email History
${context.gmailContext.map(g => `### ${g.participantEmail}\n${g.summary}\nMaterials: ${JSON.stringify(g.materials)}\nLast touchpoint: ${g.lastTouchpoint ? `${g.lastTouchpoint.date.toISOString()} — ${g.lastTouchpoint.summary}` : 'None'}`).join('\n\n')}

## Past Meeting Notes (Fathom)
${context.fathomContext.length > 0 ? context.fathomContext.map(f => `- ${f.meetingDate.toISOString()}: ${f.summary}\n  Action items: ${f.actionItems.join(', ') || 'None'}`).join('\n') : 'No past meeting notes available.'}

## Manual Notes
${context.manualNotes.length > 0 ? context.manualNotes.map(n => `- [${n.type}] ${n.content}`).join('\n') : 'No manual notes.'}

## Data Gaps
${context.dataGaps.length > 0 ? context.dataGaps.join(', ') : 'None — all data sources returned successfully.'}

---

Generate a prep pack as JSON matching this schema exactly:
{
  "meetingInfo": {
    "title": "string",
    "time": "string (human-readable)",
    "participants": [{ "name": "string", "role": "string or undefined", "org": "string or undefined" }],
    "inferredType": "investor | partner | customer | internal | other",
    "objective": "string (inferred from description) or undefined"
  },
  ${context.meetingMode !== 'internal' ? `"participantProfiles": [{ "name": "string", "currentRole": "string", "company": "string", "background": "string (2-3 sentences)", "highlights": ["string"], "recentThemes": ["string"] }],
  "companyContext": [{ "name": "string", "description": "string", "stage": "string or undefined", "size": "string or undefined", "recentNews": ["string"] }],

IMPORTANT: Only include EXTERNAL participants (non @lemnisca.bio) in participantProfiles and companyContext. Do NOT include anyone with @lemnisca.bio email — they are internal team members and Pushkar already knows them.
` : ''}
  "priorInteractionSummary": "string (narrative synthesis of all prior interactions)",
  "lastTouchpoint": { "date": "string", "summary": "string" } or null,
  "materialsExchanged": [{ "description": "string", "type": "string", "date": "string or undefined", "link": "string or undefined" }],
  "openLoops": [{ "item": "string", "context": "string", "lastMentioned": "string or undefined" }],
  "commitments": [{ "commitment": "string", "by": "us | them", "status": "pending | delivered", "context": "string or undefined" }],
  "talkingPoints": ["string (contextually relevant questions and topics)"],
  "nextStepChecklist": ["string (recommended outcomes to aim for)"],
  "dataGaps": ["string"] or undefined
}

Guidelines:
- Talking points should be specific and actionable, not generic
- Open loops should surface unresolved items from past conversations
- Commitments should track promises by either side
- Next steps should be concrete recommended outcomes for THIS meeting
- If data is thin, note it in dataGaps and work with what's available

Return ONLY valid JSON, no markdown fences.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
}
