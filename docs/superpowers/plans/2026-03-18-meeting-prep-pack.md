# Meeting Prep Pack Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated meeting preparation system that monitors Google Calendar, assembles context from Gmail/LinkedIn/Tavily/Fathom, processes through Gemini Flash, and delivers formatted prep emails + a smart calendar dashboard.

**Architecture:** Two-process system on Railway — Next.js App Router (dashboard + API) and a standalone node-cron scheduler (morning scan + 5-min prep trigger). Both share `src/lib/` for DB, integrations, and pipeline logic. Drizzle ORM with Supabase PostgreSQL.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Drizzle ORM, Supabase, Gemini Flash, Gmail API, React Email, Tavily, Lobstr.io, Fathom, node-cron, Tailwind CSS, Railway.

**Spec:** `docs/superpowers/specs/2026-03-18-meeting-prep-pack-design.md`

---

## Phase 1: Foundation

### Task 1: Scaffold Next.js Project + Dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.env.local`
- Create: `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "/Users/aryanjakhar/Desktop/Lemnisca/LemniscaProductSprint/Meeting Prep"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm postgres dotenv node-cron @google-cloud/local-auth googleapis @react-email/components react-email @google/generative-ai
npm install -D drizzle-kit @types/node-cron tsx
```

- [ ] **Step 3: Install integration dependencies**

```bash
npm install @tavily/core
```

- [ ] **Step 4: Create `.env.local` with all required variables**

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# Supabase
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Gemini
GEMINI_API_KEY=

# Tavily
TAVILY_API_KEY=

# Lobstr.io
LOBSTRIO_API_KEY=

# Fathom
FATHOM_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SENDER_EMAIL=aryan.jakhar@lemnisca.bio
RECIPIENT_EMAIL=aryan.jakhar@lemnisca.bio
MORNING_SCAN_HOUR=7
```

- [ ] **Step 5: Verify the app starts**

```bash
npm run dev
```
Expected: Next.js dev server starts on localhost:3000.

- [ ] **Step 6: Initialize git repo and commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Define all shared types**

```typescript
// src/types/index.ts

// === Enums ===
export type TemplateType = 'internal' | 'external';
export type MeetingMode = 'internal' | 'external_first_time' | 'external_repeat';
export type MeetingType = 'investor' | 'partner' | 'customer' | 'internal' | 'other';
export type PrepStatus = 'pending' | 'generating' | 'ready' | 'failed';
export type NoteType = 'pre_meeting' | 'post_meeting' | 'general';
export type DataQuality = 'rich' | 'moderate' | 'thin';
export type MaterialType = 'attachment' | 'doc_link' | 'deck' | 'other';

// === Contact Profile (output of Gemini normalization) ===
export interface ContactProfileSchema {
  name: string;
  headline: string;
  current_role: string;
  current_company: string;
  location: string;
  about_summary: string;
  work_history: { role: string; company: string; duration: string; description_summary: string }[];
  education: { institution: string; degree: string; field: string; years: string }[];
  key_skills: string[];
  recent_activity_themes: string[];
  company_context: string;
  notable_mentions: string[];
  profile_brief: string;
  data_quality: DataQuality;
}

// === Material Link ===
export interface MaterialLink {
  description: string;
  type: MaterialType;
  url?: string;
  date?: string;
}

// === Pipeline Types ===
export interface ParticipantContext {
  email: string;
  name: string;
  isExternal: boolean;
  isNewContact: boolean;
  profile?: ContactProfileSchema;
}

export interface GmailThreadContext {
  participantEmail: string;
  summary: string;
  materials: MaterialLink[];
  lastTouchpoint: { date: Date; summary: string } | null;
}

export interface FathomMeetingNote {
  meetingDate: Date;
  summary: string;
  actionItems: string[];
  decisions: string[];
}

export interface AssembledContext {
  meeting: {
    title: string;
    startTime: Date;
    endTime: Date;
    description?: string;
    conferenceLink?: string;
  };
  participants: ParticipantContext[];
  meetingMode: MeetingMode;
  gmailContext: GmailThreadContext[];
  fathomContext: FathomMeetingNote[];
  manualNotes: { content: string; type: string; createdAt: Date }[];
  dataGaps: string[];
}

// === Prep Pack (output of Gemini generation) ===
export interface PrepPack {
  meetingInfo: {
    title: string;
    time: string;
    participants: { name: string; role?: string; org?: string }[];
    inferredType: string;
    objective?: string;
  };
  participantProfiles?: {
    name: string;
    currentRole: string;
    company: string;
    background: string;
    highlights: string[];
    recentThemes: string[];
  }[];
  companyContext?: {
    name: string;
    description: string;
    stage?: string;
    size?: string;
    recentNews: string[];
  }[];
  priorInteractionSummary: string;
  lastTouchpoint: { date: string; summary: string } | null;
  materialsExchanged: { description: string; type: string; date?: string; link?: string }[];
  openLoops: { item: string; context: string; lastMentioned?: string }[];
  commitments: { commitment: string; by: 'us' | 'them'; status: 'pending' | 'delivered'; context?: string }[];
  talkingPoints: string[];
  nextStepChecklist: string[];
  dataGaps?: string[];
}

// === Calendar Event (from Google Calendar API) ===
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  conferenceLink?: string;
  attendees: { email: string; name?: string; responseStatus?: string }[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript type definitions"
```

---

### Task 3: Drizzle Schema + Database Setup

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Define Drizzle schema**

```typescript
// src/lib/db/schema.ts
import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const templateTypeEnum = pgEnum('template_type', ['internal', 'external']);
export const meetingModeEnum = pgEnum('meeting_mode', ['internal', 'external_first_time', 'external_repeat']);
export const meetingTypeEnum = pgEnum('meeting_type', ['investor', 'partner', 'customer', 'internal', 'other']);
export const prepStatusEnum = pgEnum('prep_status', ['pending', 'generating', 'ready', 'failed']);
export const noteTypeEnum = pgEnum('note_type', ['pre_meeting', 'post_meeting', 'general']);

export const meetingsProcessed = pgTable('meetings_processed', {
  id: uuid('id').defaultRandom().primaryKey(),
  calendarEventId: text('calendar_event_id').unique().notNull(),
  title: text('title').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  templateType: templateTypeEnum('template_type').notNull(),
  meetingMode: meetingModeEnum('meeting_mode').notNull(),
  meetingType: meetingTypeEnum('meeting_type'),
  prepContent: jsonb('prep_content'),
  prepStatus: prepStatusEnum('prep_status').notNull().default('pending'),
  prepSentAt: timestamp('prep_sent_at', { withTimezone: true }),
  calendarDescription: text('calendar_description'),
  conferenceLink: text('conference_link'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  organization: text('organization'),
  linkedinUrl: text('linkedin_url'),
  linkedinProfile: jsonb('linkedin_profile'),
  researchData: jsonb('research_data'),
  profileSchema: jsonb('profile_schema'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contactNotes = pgTable('contact_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  noteType: noteTypeEnum('note_type').notNull(),
  content: text('content').notNull(),
  meetingId: uuid('meeting_id').references(() => meetingsProcessed.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const blocklist = pgTable('blocklist', {
  id: uuid('id').defaultRandom().primaryKey(),
  titlePattern: text('title_pattern').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const meetingParticipants = pgTable('meeting_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').references(() => meetingsProcessed.id).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  isExternal: boolean('is_external').notNull(),
});
```

- [ ] **Step 3: Create database client**

```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```
Expected: Tables created in Supabase. Verify via Supabase dashboard.

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts src/lib/db/ drizzle/
git commit -m "feat: add Drizzle schema and database setup"
```

---

### Task 4: Database Query Functions

**Files:**
- Create: `src/lib/db/queries.ts`

- [ ] **Step 1: Write reusable query functions**

```typescript
// src/lib/db/queries.ts
import { eq, and, inArray, gte, lte, ilike } from 'drizzle-orm';
import { db } from './client';
import { meetingsProcessed, contacts, contactNotes, blocklist, meetingParticipants } from './schema';
import type { PrepPack, ContactProfileSchema, MeetingMode, TemplateType, MeetingType, PrepStatus, NoteType } from '@/types';

// === Meetings ===

export async function getMeetingByCalendarEventId(calendarEventId: string) {
  const results = await db.select().from(meetingsProcessed).where(eq(meetingsProcessed.calendarEventId, calendarEventId));
  return results[0] ?? null;
}

export async function getMeetingById(id: string) {
  const results = await db.select().from(meetingsProcessed).where(eq(meetingsProcessed.id, id));
  return results[0] ?? null;
}

export async function getTodaysMeetings() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return db.select().from(meetingsProcessed)
    .where(and(
      gte(meetingsProcessed.startTime, startOfDay),
      lte(meetingsProcessed.startTime, endOfDay),
    ))
    .orderBy(meetingsProcessed.startTime);
}

export async function createMeeting(data: {
  calendarEventId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  templateType: TemplateType;
  meetingMode: MeetingMode;
  calendarDescription?: string;
  conferenceLink?: string;
}) {
  const results = await db.insert(meetingsProcessed).values(data).returning();
  return results[0];
}

export async function updateMeetingPrepContent(id: string, prepContent: PrepPack, meetingType?: MeetingType) {
  await db.update(meetingsProcessed)
    .set({ prepContent, meetingType, prepStatus: 'ready' as PrepStatus })
    .where(eq(meetingsProcessed.id, id));
}

export async function updateMeetingPrepStatus(id: string, status: PrepStatus) {
  await db.update(meetingsProcessed)
    .set({ prepStatus: status })
    .where(eq(meetingsProcessed.id, id));
}

export async function markMeetingEmailSent(id: string) {
  await db.update(meetingsProcessed)
    .set({ prepSentAt: new Date() })
    .where(eq(meetingsProcessed.id, id));
}

// === Contacts ===

export async function getContactByEmail(email: string) {
  const results = await db.select().from(contacts).where(eq(contacts.email, email.toLowerCase()));
  return results[0] ?? null;
}

export async function getContactById(id: string) {
  const results = await db.select().from(contacts).where(eq(contacts.id, id));
  return results[0] ?? null;
}

export async function getAllContacts(search?: string) {
  if (search) {
    return db.select().from(contacts).where(
      ilike(contacts.name, `%${search}%`)
    ).orderBy(contacts.name);
  }
  return db.select().from(contacts).orderBy(contacts.name);
}

export async function createContact(data: {
  email: string;
  name: string;
  organization?: string;
}) {
  const results = await db.insert(contacts).values({
    ...data,
    email: data.email.toLowerCase(),
  }).returning();
  return results[0];
}

export async function updateContactLinkedIn(id: string, linkedinUrl: string) {
  await db.update(contacts)
    .set({ linkedinUrl })
    .where(eq(contacts.id, id));
}

export async function updateContactProfile(id: string, data: {
  linkedinProfile?: unknown;
  researchData?: unknown;
  profileSchema?: ContactProfileSchema;
}) {
  await db.update(contacts)
    .set(data)
    .where(eq(contacts.id, id));
}

export async function updateContactLastInteraction(id: string) {
  await db.update(contacts)
    .set({ lastInteractionAt: new Date() })
    .where(eq(contacts.id, id));
}

// === Contact Notes ===

export async function getNotesForContact(contactId: string) {
  return db.select().from(contactNotes)
    .where(eq(contactNotes.contactId, contactId))
    .orderBy(contactNotes.createdAt);
}

export async function getNotesForMeeting(meetingId: string) {
  return db.select().from(contactNotes)
    .where(eq(contactNotes.meetingId, meetingId))
    .orderBy(contactNotes.createdAt);
}

export async function createNote(data: {
  contactId: string;
  noteType: NoteType;
  content: string;
  meetingId?: string;
}) {
  const results = await db.insert(contactNotes).values(data).returning();
  return results[0];
}

// === Blocklist ===

export async function getBlocklist() {
  return db.select().from(blocklist).orderBy(blocklist.createdAt);
}

export async function isBlocklisted(title: string) {
  const entries = await db.select().from(blocklist);
  return entries.some(entry => entry.titlePattern === title);
}

export async function addToBlocklist(titlePattern: string) {
  const results = await db.insert(blocklist).values({ titlePattern }).returning();
  return results[0];
}

export async function removeFromBlocklist(id: string) {
  await db.delete(blocklist).where(eq(blocklist.id, id));
}

// === Meeting Participants ===

export async function addMeetingParticipant(data: {
  meetingId: string;
  contactId: string;
  isExternal: boolean;
}) {
  const results = await db.insert(meetingParticipants).values(data).returning();
  return results[0];
}

export async function getParticipantsForMeeting(meetingId: string) {
  return db.select({
    participant: meetingParticipants,
    contact: contacts,
  })
    .from(meetingParticipants)
    .innerJoin(contacts, eq(meetingParticipants.contactId, contacts.id))
    .where(eq(meetingParticipants.meetingId, meetingId));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/queries.ts
git commit -m "feat: add reusable database query functions"
```

---

### Task 5: Google OAuth + Auth Module

**Files:**
- Create: `src/lib/google/auth.ts`

- [ ] **Step 1: Build Google auth client with token refresh**

```typescript
// src/lib/google/auth.ts
import { google } from 'googleapis';

let cachedAuth: ReturnType<typeof google.auth.OAuth2> | null = null;

export function getGoogleAuth() {
  if (cachedAuth) return cachedAuth;

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  cachedAuth = auth;
  return auth;
}

export function getCalendarClient() {
  return google.calendar({ version: 'v3', auth: getGoogleAuth() });
}

export function getGmailClient() {
  return google.gmail({ version: 'v1', auth: getGoogleAuth() });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/google/auth.ts
git commit -m "feat: add Google OAuth auth module"
```

---

### Task 6: Google Calendar Integration

**Files:**
- Create: `src/lib/google/calendar.ts`

- [ ] **Step 1: Build calendar event fetching**

```typescript
// src/lib/google/calendar.ts
import { getCalendarClient } from './auth';
import type { CalendarEvent } from '@/types';

export async function getUpcomingEvents(minutesAhead: number): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();
  const now = new Date();
  const timeMax = new Date(now.getTime() + minutesAhead * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items ?? []).map(parseCalendarEvent).filter(Boolean) as CalendarEvent[];
}

export async function getTodaysEvents(): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items ?? []).map(parseCalendarEvent).filter(Boolean) as CalendarEvent[];
}

function parseCalendarEvent(event: any): CalendarEvent | null {
  if (!event.id || !event.start?.dateTime) return null;

  const attendees = (event.attendees ?? []).map((a: any) => ({
    email: a.email,
    name: a.displayName,
    responseStatus: a.responseStatus,
  }));

  // Extract conference link
  let conferenceLink: string | undefined;
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
    conferenceLink = videoEntry?.uri;
  }
  if (!conferenceLink && event.hangoutLink) {
    conferenceLink = event.hangoutLink;
  }

  return {
    id: event.id,
    title: event.summary ?? 'Untitled',
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end?.dateTime ?? event.start.dateTime),
    description: event.description,
    conferenceLink,
    attendees,
  };
}

export function buildCalendarEventId(eventId: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `${eventId}_${dateStr}`;
}

export function isExternalParticipant(email: string): boolean {
  return !email.endsWith('@lemnisca.bio');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/google/calendar.ts
git commit -m "feat: add Google Calendar integration"
```

---

### Task 7: Gmail Integration (Read + Send)

**Files:**
- Create: `src/lib/google/gmail.ts`

- [ ] **Step 1: Build Gmail thread search and email sending**

```typescript
// src/lib/google/gmail.ts
import { getGmailClient } from './auth';

export interface GmailThread {
  id: string;
  snippet: string;
  messages: GmailMessage[];
}

export interface GmailMessage {
  id: string;
  date: Date;
  from: string;
  to: string;
  subject: string;
  body: string;
}

export async function searchThreadsByEmail(participantEmail: string, maxResults = 10): Promise<GmailThread[]> {
  const gmail = getGmailClient();

  const response = await gmail.users.threads.list({
    userId: 'me',
    q: participantEmail,
    maxResults,
  });

  const threads: GmailThread[] = [];
  for (const threadRef of response.data.threads ?? []) {
    if (!threadRef.id) continue;
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadRef.id,
      format: 'full',
    });

    const messages = (thread.data.messages ?? []).map(parseGmailMessage).filter(Boolean) as GmailMessage[];
    threads.push({
      id: threadRef.id,
      snippet: thread.data.messages?.[0]?.snippet ?? '',
      messages,
    });
  }

  return threads;
}

export async function searchFathomEmails(participantQuery: string, maxResults = 5): Promise<GmailThread[]> {
  const gmail = getGmailClient();

  const response = await gmail.users.threads.list({
    userId: 'me',
    q: `from:notifications@fathom.video ${participantQuery}`,
    maxResults,
  });

  const threads: GmailThread[] = [];
  for (const threadRef of response.data.threads ?? []) {
    if (!threadRef.id) continue;
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadRef.id,
      format: 'full',
    });

    const messages = (thread.data.messages ?? []).map(parseGmailMessage).filter(Boolean) as GmailMessage[];
    threads.push({
      id: threadRef.id,
      snippet: thread.data.messages?.[0]?.snippet ?? '',
      messages,
    });
  }

  return threads;
}

function parseGmailMessage(message: any): GmailMessage | null {
  if (!message.id) return null;

  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

  let body = '';
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    const textPart = message.payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  }

  return {
    id: message.id,
    date: new Date(parseInt(message.internalDate ?? '0')),
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    body,
  };
}

export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const gmail = getGmailClient();
  const from = process.env.SENDER_EMAIL!;

  const rawMessage = createRawEmail(from, to, subject, htmlBody);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
    },
  });
}

function createRawEmail(from: string, to: string, subject: string, htmlBody: string): string {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ];

  const message = messageParts.join('\r\n');
  return Buffer.from(message).toString('base64url');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/google/gmail.ts
git commit -m "feat: add Gmail integration for thread search and email sending"
```

---

## Phase 2: Integrations + Pipeline

### Task 8: Tavily Web Search Integration

**Files:**
- Create: `src/lib/integrations/tavily.ts`

- [ ] **Step 1: Build Tavily search module**

```typescript
// src/lib/integrations/tavily.ts
import { tavily } from '@tavily/core';

let _client: ReturnType<typeof tavily> | null = null;
function getClient() {
  if (!_client) _client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  return _client;
}

export interface TavilySearchResult {
  query: string;
  results: { title: string; url: string; content: string; score: number }[];
}

export async function searchContactContext(name: string, company?: string): Promise<TavilySearchResult> {
  const query = company ? `${name} ${company}` : name;

  const response = await getClient().search(query, {
    maxResults: 10,
    searchDepth: 'advanced',
  });

  return {
    query,
    results: response.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
  };
}

export async function searchCompanyContext(company: string): Promise<TavilySearchResult> {
  const response = await client.search(company, {
    maxResults: 5,
    searchDepth: 'basic',
  });

  return {
    query: company,
    results: response.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/tavily.ts
git commit -m "feat: add Tavily web search integration"
```

---

### Task 9: Lobstr.io LinkedIn Integration

**Files:**
- Create: `src/lib/integrations/lobstrio.ts`

- [ ] **Step 1: Build Lobstr.io scraper module**

```typescript
// src/lib/integrations/lobstrio.ts

export interface LobstrProfile {
  fullName?: string;
  headline?: string;
  currentTitle?: string;
  currentCompany?: string;
  location?: string;
  about?: string;
  experience?: { title: string; company: string; duration: string; description?: string }[];
  education?: { school: string; degree?: string; field?: string; years?: string }[];
  skills?: string[];
  certifications?: string[];
  featuredPosts?: string[];
  recentActivity?: string[];
  rawData: Record<string, unknown>;
}

export async function scrapeLinkedInProfile(linkedinUrl: string): Promise<LobstrProfile> {
  const response = await fetch('https://api.lobstr.io/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LOBSTRIO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scraper: 'linkedin-profile-scraper',
      url: linkedinUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lobstr.io API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Map raw API response to our structured format
  // Note: exact field names depend on Lobstr.io API response format — adjust as needed
  return {
    fullName: data.full_name ?? data.name,
    headline: data.headline,
    currentTitle: data.current_title ?? data.title,
    currentCompany: data.current_company ?? data.company,
    location: data.location,
    about: data.about ?? data.summary,
    experience: data.experience ?? data.positions,
    education: data.education,
    skills: data.skills,
    certifications: data.certifications,
    featuredPosts: data.featured,
    recentActivity: data.recent_activity ?? data.activities,
    rawData: data,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/lobstrio.ts
git commit -m "feat: add Lobstr.io LinkedIn scraper integration"
```

---

### Task 10: Fathom Integration (Dual-Path)

**Files:**
- Create: `src/lib/integrations/fathom.ts`

- [ ] **Step 1: Build Fathom module with API primary + Gmail fallback**

```typescript
// src/lib/integrations/fathom.ts
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
    if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
      console.warn('[Fathom] API access denied, switching to Gmail fallback permanently for this session');
      useGmailFallback = true;
      return fetchViaGmail(participantEmails);
    }
    throw error;
  }
}

// Path A: Direct Fathom API
async function fetchViaApi(participantEmails: string[]): Promise<FathomMeetingNote[]> {
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) {
    console.warn('[Fathom] No API key configured, using Gmail fallback');
    useGmailFallback = true;
    return fetchViaGmail(participantEmails);
  }

  const response = await fetch('https://api.fathom.video/external/v1/meetings?include_transcript=false', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error: any = new Error(`Fathom API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const meetings = data.meetings ?? data ?? [];

  // Filter meetings that include any of the participant emails
  const relevantMeetings = meetings.filter((m: any) => {
    const invitees = m.calendar_invitees ?? m.attendees ?? [];
    return invitees.some((inv: any) =>
      participantEmails.includes(inv.email?.toLowerCase())
    );
  });

  return relevantMeetings.map((m: any) => ({
    meetingDate: new Date(m.created_at ?? m.date),
    summary: m.default_summary ?? m.summary ?? '',
    actionItems: (m.action_items ?? []).map((ai: any) => ai.text ?? ai.description ?? String(ai)),
    decisions: [], // Fathom API may not separate decisions — extract from summary if needed
  }));
}

// Path B: Gmail-based Fathom email extraction
async function fetchViaGmail(participantEmails: string[]): Promise<FathomMeetingNote[]> {
  const notes: FathomMeetingNote[] = [];

  for (const email of participantEmails) {
    const threads = await searchFathomEmails(email);

    for (const thread of threads) {
      for (const message of thread.messages) {
        // Parse the Fathom notification email body
        // These emails contain meeting summaries and action items
        notes.push({
          meetingDate: message.date,
          summary: message.body, // Will be processed by Gemini later
          actionItems: [],
          decisions: [],
        });
      }
    }
  }

  return notes;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/fathom.ts
git commit -m "feat: add Fathom integration with API + Gmail fallback"
```

---

### Task 11: Gemini Flash Integration (4 LLM Functions)

**Files:**
- Create: `src/lib/integrations/gemini.ts`

- [ ] **Step 1: Build Gemini module with all 4 LLM functions**

```typescript
// src/lib/integrations/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ContactProfileSchema, AssembledContext, PrepPack, GmailThreadContext, MaterialLink } from '@/types';
import type { LobstrProfile } from './lobstrio';
import type { TavilySearchResult } from './tavily';
import type { GmailThread } from '@/lib/google/gmail';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
  "companyContext": [{ "name": "string", "description": "string", "stage": "string or undefined", "size": "string or undefined", "recentNews": ["string"] }],` : ''}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/gemini.ts
git commit -m "feat: add Gemini Flash integration with 4 LLM functions"
```

---

### Task 12: Context Assembly Pipeline

**Files:**
- Create: `src/lib/pipeline/assemble-context.ts`

- [ ] **Step 1: Build the context assembly orchestrator**

```typescript
// src/lib/pipeline/assemble-context.ts
import { isExternalParticipant } from '@/lib/google/calendar';
import { searchThreadsByEmail } from '@/lib/google/gmail';
import { searchContactContext } from '@/lib/integrations/tavily';
import { scrapeLinkedInProfile } from '@/lib/integrations/lobstrio';
import { fetchMeetingNotes } from '@/lib/integrations/fathom';
import { normalizeContactProfile, summarizeGmailThreads } from '@/lib/integrations/gemini';
import { getContactByEmail, createContact, updateContactProfile, getNotesForContact } from '@/lib/db/queries';
import type { CalendarEvent, AssembledContext, ParticipantContext, GmailThreadContext, MeetingMode } from '@/types';

export async function assembleContext(event: CalendarEvent): Promise<AssembledContext> {
  const dataGaps: string[] = [];

  // Step 1: Parse and classify participants
  const participants = await parseParticipants(event.attendees);

  // Determine meeting mode
  const hasExternal = participants.some(p => p.isExternal);
  const hasNewContact = participants.some(p => p.isNewContact);
  let meetingMode: MeetingMode = 'internal';
  if (hasExternal && hasNewContact) meetingMode = 'external_first_time';
  else if (hasExternal) meetingMode = 'external_repeat';

  // Step 2: Fetch Gmail context (OPTIONAL)
  const gmailContext: GmailThreadContext[] = [];
  for (const participant of participants) {
    try {
      const threads = await searchThreadsByEmail(participant.email);
      const summary = await summarizeGmailThreads(threads, participant.email);
      gmailContext.push(summary);
    } catch (error) {
      console.error(`[Pipeline] Gmail search failed for ${participant.email}:`, error);
      dataGaps.push(`Gmail threads for ${participant.email}`);
    }
  }

  // Step 3: Fetch Fathom context (OPTIONAL)
  let fathomContext: AssembledContext['fathomContext'] = [];
  try {
    const participantEmails = participants.map(p => p.email);
    fathomContext = await fetchMeetingNotes(participantEmails);
  } catch (error) {
    console.error('[Pipeline] Fathom fetch failed:', error);
    dataGaps.push('Fathom meeting notes');
  }

  // Step 4: Research for first-time external contacts (OPTIONAL)
  if (meetingMode === 'external_first_time') {
    for (const participant of participants.filter(p => p.isExternal && p.isNewContact)) {
      try {
        await researchNewContact(participant);
      } catch (error) {
        console.error(`[Pipeline] Research failed for ${participant.email}:`, error);
        dataGaps.push(`Research data for ${participant.name}`);
      }
    }
  }

  // Step 5: Load database context (REQUIRED)
  const manualNotes: AssembledContext['manualNotes'] = [];
  for (const participant of participants) {
    const contact = await getContactByEmail(participant.email);
    if (contact) {
      // Load profile for repeat contacts
      if (contact.profileSchema && !participant.profile) {
        participant.profile = contact.profileSchema as any;
      }
      // Load notes
      const notes = await getNotesForContact(contact.id);
      for (const note of notes) {
        manualNotes.push({
          content: note.content,
          type: note.noteType,
          createdAt: note.createdAt,
        });
      }
    }
  }

  return {
    meeting: {
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      conferenceLink: event.conferenceLink,
    },
    participants,
    meetingMode,
    gmailContext,
    fathomContext,
    manualNotes,
    dataGaps,
  };
}

async function parseParticipants(
  attendees: CalendarEvent['attendees'],
): Promise<ParticipantContext[]> {
  const participants: ParticipantContext[] = [];

  for (const attendee of attendees) {
    const isExternal = isExternalParticipant(attendee.email);
    const contact = await getContactByEmail(attendee.email);

    participants.push({
      email: attendee.email,
      name: attendee.name ?? attendee.email.split('@')[0],
      isExternal,
      isNewContact: isExternal && !contact,
      profile: contact?.profileSchema as any ?? undefined,
    });
  }

  return participants;
}

async function researchNewContact(participant: ParticipantContext): Promise<void> {
  const domain = participant.email.split('@')[1];
  const company = domain.split('.')[0]; // Simple company extraction from domain

  // Run Tavily search
  const tavilyData = await searchContactContext(participant.name, company);

  // Check if LinkedIn URL was provided (contact may have been created by morning scan)
  const contact = await getContactByEmail(participant.email);
  let lobstrData = null;

  if (contact?.linkedinUrl) {
    lobstrData = await scrapeLinkedInProfile(contact.linkedinUrl);
  }

  // Normalize with Gemini
  const profile = await normalizeContactProfile(lobstrData, tavilyData);
  participant.profile = profile;

  // Store in DB
  if (contact) {
    await updateContactProfile(contact.id, {
      researchData: tavilyData,
      linkedinProfile: lobstrData,
      profileSchema: profile,
    });
  } else {
    // Create contact and store profile
    const newContact = await createContact({
      email: participant.email,
      name: participant.name,
      organization: company,
    });
    await updateContactProfile(newContact.id, {
      researchData: tavilyData,
      linkedinProfile: lobstrData,
      profileSchema: profile,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pipeline/assemble-context.ts
git commit -m "feat: add context assembly pipeline"
```

---

### Task 13: Prep Pack Generation

**Files:**
- Create: `src/lib/pipeline/generate-prep.ts`

- [ ] **Step 1: Build prep generation module**

```typescript
// src/lib/pipeline/generate-prep.ts
import { generatePrepPack as geminiGeneratePrepPack, inferMeetingType } from '@/lib/integrations/gemini';
import { updateMeetingPrepContent, updateMeetingPrepStatus } from '@/lib/db/queries';
import type { AssembledContext, PrepPack, MeetingType } from '@/types';

export async function generatePrepPack(
  meetingId: string,
  context: AssembledContext,
): Promise<PrepPack> {
  // Update status to generating
  await updateMeetingPrepStatus(meetingId, 'generating');

  try {
    // Infer meeting type
    const meetingType = await inferMeetingType(
      context.participants.map(p => ({ email: p.email, name: p.name, isExternal: p.isExternal })),
      context.meeting.description,
    );

    // Generate the full prep pack
    const prepPack = await geminiGeneratePrepPack(context);

    // Store in DB
    await updateMeetingPrepContent(meetingId, prepPack, meetingType as MeetingType);

    return prepPack;
  } catch (error) {
    await updateMeetingPrepStatus(meetingId, 'failed');
    throw error;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pipeline/generate-prep.ts
git commit -m "feat: add prep pack generation module"
```

---

### Task 14: React Email Templates

**Files:**
- Create: `src/lib/email/templates/external-prep.tsx`
- Create: `src/lib/email/templates/internal-prep.tsx`
- Create: `src/lib/email/templates/new-contact-notification.tsx`
- Create: `src/lib/email/render.ts`

- [ ] **Step 1: Create external prep email template (all 10 sections)**

```tsx
// src/lib/email/templates/external-prep.tsx
import { Html, Head, Body, Container, Section, Heading, Text, Hr, Link } from '@react-email/components';
import type { PrepPack } from '@/types';

interface ExternalPrepEmailProps {
  prepPack: PrepPack;
}

export function ExternalPrepEmail({ prepPack }: ExternalPrepEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
        <Container style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
          {/* Section 1: Meeting Info */}
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827', marginBottom: '4px' }}>
            {prepPack.meetingInfo.title}
          </Heading>
          <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '0' }}>
            {prepPack.meetingInfo.time} · {prepPack.meetingInfo.inferredType.toUpperCase()}
          </Text>
          {prepPack.meetingInfo.objective && (
            <Text style={{ color: '#374151', fontSize: '14px', fontStyle: 'italic' }}>
              Objective: {prepPack.meetingInfo.objective}
            </Text>
          )}
          <Text style={{ color: '#374151', fontSize: '14px' }}>
            Participants: {prepPack.meetingInfo.participants.map(p => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ')}
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Section 2: Participant Profiles */}
          {prepPack.participantProfiles && prepPack.participantProfiles.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Participant Profiles</Heading>
              {prepPack.participantProfiles.map((profile, i) => (
                <Section key={i} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <Text style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                    {profile.name} — {profile.currentRole} at {profile.company}
                  </Text>
                  <Text style={{ color: '#374151', fontSize: '14px' }}>{profile.background}</Text>
                  {profile.highlights.length > 0 && (
                    <Text style={{ color: '#6b7280', fontSize: '13px' }}>
                      Highlights: {profile.highlights.join(' · ')}
                    </Text>
                  )}
                </Section>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 3: Company Context */}
          {prepPack.companyContext && prepPack.companyContext.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Company Context</Heading>
              {prepPack.companyContext.map((company, i) => (
                <Section key={i} style={{ marginBottom: '12px' }}>
                  <Text style={{ fontWeight: 'bold', color: '#111827' }}>{company.name}</Text>
                  <Text style={{ color: '#374151', fontSize: '14px' }}>{company.description}</Text>
                  {company.recentNews.length > 0 && (
                    <Text style={{ color: '#6b7280', fontSize: '13px' }}>
                      Recent: {company.recentNews.join(' · ')}
                    </Text>
                  )}
                </Section>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 4: Prior Interaction Summary */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Prior Interactions</Heading>
          <Text style={{ color: '#374151', fontSize: '14px' }}>{prepPack.priorInteractionSummary}</Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Section 5: Last Touchpoint */}
          {prepPack.lastTouchpoint && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Last Touchpoint</Heading>
              <Text style={{ color: '#374151', fontSize: '14px' }}>
                <strong>{prepPack.lastTouchpoint.date}</strong> — {prepPack.lastTouchpoint.summary}
              </Text>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 6: Materials Exchanged */}
          {prepPack.materialsExchanged.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Materials Exchanged</Heading>
              {prepPack.materialsExchanged.map((m, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • {m.description} ({m.type}){m.date ? ` — ${m.date}` : ''}{m.link ? <> — <Link href={m.link}>{m.link}</Link></> : ''}
                </Text>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 7: Open Loops */}
          {prepPack.openLoops.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Open Loops</Heading>
              {prepPack.openLoops.map((loop, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • <strong>{loop.item}</strong> — {loop.context}
                </Text>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 8: Commitments */}
          {prepPack.commitments.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Commitments</Heading>
              {prepPack.commitments.map((c, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • [{c.by === 'us' ? 'WE' : 'THEY'} — {c.status.toUpperCase()}] {c.commitment}
                </Text>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 9: Talking Points */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Talking Points</Heading>
          {prepPack.talkingPoints.map((point, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              • {point}
            </Text>
          ))}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Section 10: Next Steps */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Next-Step Checklist</Heading>
          {prepPack.nextStepChecklist.map((step, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              ☐ {step}
            </Text>
          ))}

          {/* Data Gaps Warning */}
          {prepPack.dataGaps && prepPack.dataGaps.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Text style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>
                Note: Some data sources were unavailable — {prepPack.dataGaps.join(', ')}
              </Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Create internal prep email template (sections 1, 4-10)**

```tsx
// src/lib/email/templates/internal-prep.tsx
import { Html, Head, Body, Container, Section, Heading, Text, Hr, Link } from '@react-email/components';
import type { PrepPack } from '@/types';

interface InternalPrepEmailProps {
  prepPack: PrepPack;
}

export function InternalPrepEmail({ prepPack }: InternalPrepEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
        <Container style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
          {/* Section 1: Meeting Info */}
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827', marginBottom: '4px' }}>
            {prepPack.meetingInfo.title}
          </Heading>
          <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '0' }}>
            {prepPack.meetingInfo.time} · INTERNAL
          </Text>
          {prepPack.meetingInfo.objective && (
            <Text style={{ color: '#374151', fontSize: '14px', fontStyle: 'italic' }}>
              Objective: {prepPack.meetingInfo.objective}
            </Text>
          )}
          <Text style={{ color: '#374151', fontSize: '14px' }}>
            Participants: {prepPack.meetingInfo.participants.map(p => p.name).join(', ')}
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Sections 4-10: same as external but without profiles/company */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Prior Interactions</Heading>
          <Text style={{ color: '#374151', fontSize: '14px' }}>{prepPack.priorInteractionSummary}</Text>

          {prepPack.lastTouchpoint && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Last Touchpoint</Heading>
              <Text style={{ color: '#374151', fontSize: '14px' }}>
                <strong>{prepPack.lastTouchpoint.date}</strong> — {prepPack.lastTouchpoint.summary}
              </Text>
            </>
          )}

          {prepPack.materialsExchanged.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Materials Exchanged</Heading>
              {prepPack.materialsExchanged.map((m, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • {m.description} ({m.type}){m.link ? <> — <Link href={m.link}>{m.link}</Link></> : ''}
                </Text>
              ))}
            </>
          )}

          {prepPack.openLoops.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Open Loops</Heading>
              {prepPack.openLoops.map((loop, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • <strong>{loop.item}</strong> — {loop.context}
                </Text>
              ))}
            </>
          )}

          {prepPack.commitments.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Commitments</Heading>
              {prepPack.commitments.map((c, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • [{c.by === 'us' ? 'WE' : 'THEY'} — {c.status.toUpperCase()}] {c.commitment}
                </Text>
              ))}
            </>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Talking Points</Heading>
          {prepPack.talkingPoints.map((point, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              • {point}
            </Text>
          ))}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Next-Step Checklist</Heading>
          {prepPack.nextStepChecklist.map((step, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              ☐ {step}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Create new contact notification email**

```tsx
// src/lib/email/templates/new-contact-notification.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components';

interface NewContactNotificationProps {
  contacts: { name: string; company: string; meetingTime: string; contactId: string }[];
  dashboardUrl: string;
}

export function NewContactNotification({ contacts, dashboardUrl }: NewContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
        <Container style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
          <Heading as="h1" style={{ fontSize: '22px', color: '#111827' }}>
            New contacts on today's calendar
          </Heading>
          <Text style={{ color: '#374151', fontSize: '14px' }}>
            Confirm their LinkedIn URLs so we can build profiles for your prep packs.
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {contacts.map((contact, i) => (
            <Container key={i} style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <Text style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                {contact.name} from {contact.company}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '0' }}>
                Meeting at {contact.meetingTime}
              </Text>
              <Button
                href={`${dashboardUrl}/contacts/${contact.contactId}`}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none' }}
              >
                Add LinkedIn URL
              </Button>
            </Container>
          ))}
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Create email render utility**

```typescript
// src/lib/email/render.ts
import { render } from '@react-email/components';
import { ExternalPrepEmail } from './templates/external-prep';
import { InternalPrepEmail } from './templates/internal-prep';
import { NewContactNotification } from './templates/new-contact-notification';
import type { PrepPack, TemplateType } from '@/types';

export async function renderPrepEmail(prepPack: PrepPack, templateType: TemplateType): Promise<string> {
  if (templateType === 'internal') {
    return await render(InternalPrepEmail({ prepPack }));
  }
  return await render(ExternalPrepEmail({ prepPack }));
}

export async function renderNewContactNotification(
  contacts: { name: string; company: string; meetingTime: string; contactId: string }[],
  dashboardUrl: string,
): Promise<string> {
  return await render(NewContactNotification({ contacts, dashboardUrl }));
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/
git commit -m "feat: add React Email templates and render utility"
```

---

### Task 15: Email Delivery Pipeline

**Files:**
- Create: `src/lib/pipeline/deliver-email.ts`

- [ ] **Step 1: Build email delivery module**

```typescript
// src/lib/pipeline/deliver-email.ts
import { sendEmail } from '@/lib/google/gmail';
import { renderPrepEmail } from '@/lib/email/render';
import { markMeetingEmailSent } from '@/lib/db/queries';
import type { PrepPack, TemplateType } from '@/types';

export async function deliverPrepEmail(
  meetingId: string,
  prepPack: PrepPack,
  templateType: TemplateType,
  meetingTitle: string,
  meetingTime: string,
): Promise<void> {
  const recipientEmail = process.env.RECIPIENT_EMAIL!;
  const subject = `Prep Pack: ${meetingTitle} — ${meetingTime}`;

  const html = await renderPrepEmail(prepPack, templateType);

  await sendEmail(recipientEmail, subject, html);
  await markMeetingEmailSent(meetingId);

  console.log(`[Email] Prep pack sent for "${meetingTitle}" to ${recipientEmail}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pipeline/deliver-email.ts
git commit -m "feat: add email delivery pipeline"
```

---

### Task 16: Scheduler Service

**Files:**
- Create: `src/scheduler/index.ts`
- Create: `src/scheduler/morning-scan.ts`
- Create: `src/scheduler/prep-trigger.ts`

- [ ] **Step 1: Build morning scan job**

```typescript
// src/scheduler/morning-scan.ts
import { getTodaysEvents, isExternalParticipant } from '@/lib/google/calendar';
import { getContactByEmail, createContact } from '@/lib/db/queries';
import { sendEmail } from '@/lib/google/gmail';
import { renderNewContactNotification } from '@/lib/email/render';

export async function runMorningScan(): Promise<void> {
  console.log('[Morning Scan] Starting daily scan...');

  const events = await getTodaysEvents();
  const newContacts: { name: string; company: string; meetingTime: string; contactId: string }[] = [];

  for (const event of events) {
    for (const attendee of event.attendees) {
      if (!isExternalParticipant(attendee.email)) continue;

      const existing = await getContactByEmail(attendee.email);
      if (existing) continue;

      const domain = attendee.email.split('@')[1];
      const company = domain.split('.')[0];
      const name = attendee.name ?? attendee.email.split('@')[0];

      const contact = await createContact({
        email: attendee.email,
        name,
        organization: company,
      });

      newContacts.push({
        name,
        company,
        meetingTime: event.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        contactId: contact.id,
      });
    }
  }

  if (newContacts.length > 0) {
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const html = await renderNewContactNotification(newContacts, dashboardUrl);
    const recipientEmail = process.env.RECIPIENT_EMAIL!;

    await sendEmail(
      recipientEmail,
      `New contact${newContacts.length > 1 ? 's' : ''} today: ${newContacts.map(c => c.name).join(', ')} — confirm LinkedIn`,
      html,
    );

    console.log(`[Morning Scan] Found ${newContacts.length} new contacts, notification sent.`);
  } else {
    console.log('[Morning Scan] No new contacts found.');
  }
}
```

- [ ] **Step 2: Build prep trigger job**

```typescript
// src/scheduler/prep-trigger.ts
import { getUpcomingEvents, buildCalendarEventId, isExternalParticipant } from '@/lib/google/calendar';
import { getMeetingByCalendarEventId, createMeeting, isBlocklisted, addMeetingParticipant, getContactByEmail, updateContactLastInteraction } from '@/lib/db/queries';
import { assembleContext } from '@/lib/pipeline/assemble-context';
import { generatePrepPack } from '@/lib/pipeline/generate-prep';
import { deliverPrepEmail } from '@/lib/pipeline/deliver-email';
import type { TemplateType, MeetingMode } from '@/types';

export async function runPrepTrigger(): Promise<void> {
  console.log('[Prep Trigger] Checking for upcoming meetings...');

  const events = await getUpcomingEvents(25); // Next 25 minutes

  for (const event of events) {
    const calendarEventId = buildCalendarEventId(event.id, event.startTime);

    // Skip if already processed
    const existing = await getMeetingByCalendarEventId(calendarEventId);
    if (existing) {
      console.log(`[Prep Trigger] Already processed: "${event.title}"`);
      continue;
    }

    // Skip if blocklisted
    if (await isBlocklisted(event.title)) {
      console.log(`[Prep Trigger] Blocklisted: "${event.title}"`);
      continue;
    }

    console.log(`[Prep Trigger] Processing: "${event.title}"`);

    try {
      // Determine template type and meeting mode
      const hasExternalParticipant = event.attendees.some(a => isExternalParticipant(a.email));
      const templateType: TemplateType = hasExternalParticipant ? 'external' : 'internal';

      // Check if any external participants are new
      let meetingMode: MeetingMode = 'internal';
      if (hasExternalParticipant) {
        const externalAttendees = event.attendees.filter(a => isExternalParticipant(a.email));
        let hasNew = false;
        for (const attendee of externalAttendees) {
          const contact = await getContactByEmail(attendee.email);
          if (!contact) hasNew = true;
        }
        meetingMode = hasNew ? 'external_first_time' : 'external_repeat';
      }

      // Create meeting record
      const meeting = await createMeeting({
        calendarEventId,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        templateType,
        meetingMode,
        calendarDescription: event.description,
        conferenceLink: event.conferenceLink,
      });

      // Link participants
      for (const attendee of event.attendees) {
        let contact = await getContactByEmail(attendee.email);
        if (!contact) {
          const domain = attendee.email.split('@')[1];
          contact = await createContact({
            email: attendee.email,
            name: attendee.name ?? attendee.email.split('@')[0],
            organization: domain.split('.')[0],
          });
        }
        await addMeetingParticipant({
          meetingId: meeting.id,
          contactId: contact.id,
          isExternal: isExternalParticipant(attendee.email),
        });
        await updateContactLastInteraction(contact.id);
      }

      // Assemble context
      const context = await assembleContext(event);

      // Generate prep pack
      const prepPack = await generatePrepPack(meeting.id, context);

      // Deliver email
      const meetingTime = event.startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      await deliverPrepEmail(meeting.id, prepPack, templateType, event.title, meetingTime);

      console.log(`[Prep Trigger] Successfully processed: "${event.title}"`);
    } catch (error) {
      console.error(`[Prep Trigger] Failed to process "${event.title}":`, error);
    }
  }
}
```

- [ ] **Step 3: Build scheduler entry point**

```typescript
// src/scheduler/index.ts
import 'dotenv/config';
import cron from 'node-cron';
import { runMorningScan } from './morning-scan';
import { runPrepTrigger } from './prep-trigger';

const morningHour = process.env.MORNING_SCAN_HOUR ?? '7';

console.log('[Scheduler] Starting...');

// Job 1: Morning scan — daily at configured hour
cron.schedule(`0 ${morningHour} * * *`, async () => {
  try {
    await runMorningScan();
  } catch (error) {
    console.error('[Scheduler] Morning scan failed:', error);
  }
});
console.log(`[Scheduler] Morning scan scheduled for ${morningHour}:00 AM daily`);

// Job 2: Prep trigger — every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await runPrepTrigger();
  } catch (error) {
    console.error('[Scheduler] Prep trigger failed:', error);
  }
});
console.log('[Scheduler] Prep trigger scheduled every 5 minutes');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('[Scheduler] Shutting down...');
  process.exit(0);
});
```

- [ ] **Step 4: Add scheduler start script to package.json**

Add to `package.json` scripts:
```json
"scheduler": "tsx src/scheduler/index.ts"
```

- [ ] **Step 5: Create start.sh for production**

```bash
#!/bin/bash
# start.sh — Launches both Next.js and scheduler
echo "Starting Meeting Prep Pack..."

# Start Next.js in background
npm run start &
NEXTJS_PID=$!

# Start scheduler in background
npm run scheduler &
SCHEDULER_PID=$!

echo "Next.js PID: $NEXTJS_PID"
echo "Scheduler PID: $SCHEDULER_PID"

# Wait for either to exit
wait -n $NEXTJS_PID $SCHEDULER_PID
EXIT_CODE=$?

# If one exits, kill the other
kill $NEXTJS_PID 2>/dev/null
kill $SCHEDULER_PID 2>/dev/null

exit $EXIT_CODE
```

- [ ] **Step 6: Commit**

```bash
chmod +x start.sh
git add src/scheduler/ start.sh package.json
git commit -m "feat: add scheduler service with morning scan and prep trigger"
```

---

## Phase 3: Dashboard

### Task 17: Dashboard Layout + Navigation

**Files:**
- Create: `src/app/layout.tsx` (modify existing)
- Create: `src/app/components/nav.tsx`

- [ ] **Step 1: Create navigation component**

```tsx
// src/app/components/nav.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Today' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/blocklist', label: 'Blocklist' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Meeting Prep
          </Link>
          <div className="flex gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Nav } from './components/nav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Meeting Prep Pack',
  description: 'Automated meeting preparation for Lemnisca',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/components/nav.tsx
git commit -m "feat: add dashboard layout and navigation"
```

---

### Task 18: API Routes

**Files:**
- Create: `src/app/api/meetings/route.ts`
- Create: `src/app/api/meetings/[id]/route.ts`
- Create: `src/app/api/meetings/[id]/generate/route.ts`
- Create: `src/app/api/meetings/[id]/notes/route.ts`
- Create: `src/app/api/contacts/route.ts`
- Create: `src/app/api/contacts/[id]/route.ts`
- Create: `src/app/api/contacts/[id]/linkedin/route.ts`
- Create: `src/app/api/blocklist/route.ts`
- Create: `src/app/api/blocklist/[id]/route.ts`

- [ ] **Step 1: Create meetings API routes**

```typescript
// src/app/api/meetings/route.ts
import { NextResponse } from 'next/server';
import { getTodaysMeetings } from '@/lib/db/queries';

export async function GET() {
  const meetings = await getTodaysMeetings();
  return NextResponse.json(meetings);
}
```

```typescript
// src/app/api/meetings/[id]/route.ts
import { NextResponse } from 'next/server';
import { getMeetingById, getParticipantsForMeeting, getNotesForMeeting } from '@/lib/db/queries';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const participants = await getParticipantsForMeeting(id);
  const notes = await getNotesForMeeting(id);

  return NextResponse.json({ meeting, participants, notes });
}
```

```typescript
// src/app/api/meetings/[id]/generate/route.ts
// NOTE: Manual trigger skips blocklist — if Pushkar explicitly wants a prep pack, respect that
import { NextResponse } from 'next/server';
import { getMeetingById, getParticipantsForMeeting } from '@/lib/db/queries';
import { assembleContext } from '@/lib/pipeline/assemble-context';
import { generatePrepPack } from '@/lib/pipeline/generate-prep';
import { deliverPrepEmail } from '@/lib/pipeline/deliver-email';
import type { CalendarEvent } from '@/types';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Build a CalendarEvent-like object from stored meeting data
  const participants = await getParticipantsForMeeting(id);
  const event: CalendarEvent = {
    id: meeting.calendarEventId,
    title: meeting.title,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    description: meeting.calendarDescription ?? undefined,
    conferenceLink: meeting.conferenceLink ?? undefined,
    attendees: participants.map(p => ({
      email: p.contact.email,
      name: p.contact.name,
    })),
  };

  const context = await assembleContext(event);
  const prepPack = await generatePrepPack(id, context);

  const meetingTime = meeting.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  await deliverPrepEmail(id, prepPack, meeting.templateType as any, meeting.title, meetingTime);

  return NextResponse.json({ success: true, prepPack });
}
```

```typescript
// src/app/api/meetings/[id]/notes/route.ts
import { NextResponse } from 'next/server';
import { createNote, getParticipantsForMeeting } from '@/lib/db/queries';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content, noteType = 'post_meeting' } = await req.json();

  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

  // Add note to all participants of this meeting
  const participants = await getParticipantsForMeeting(id);
  const notes = [];
  for (const p of participants) {
    const note = await createNote({
      contactId: p.contact.id,
      noteType,
      content,
      meetingId: id,
    });
    notes.push(note);
  }

  return NextResponse.json({ success: true, notes });
}
```

- [ ] **Step 2: Create contacts API routes**

```typescript
// src/app/api/contacts/route.ts
import { NextResponse } from 'next/server';
import { getAllContacts } from '@/lib/db/queries';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? undefined;
  const contacts = await getAllContacts(search);
  return NextResponse.json(contacts);
}
```

```typescript
// src/app/api/contacts/[id]/route.ts
import { NextResponse } from 'next/server';
import { getContactById, getNotesForContact } from '@/lib/db/queries';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const notes = await getNotesForContact(id);
  return NextResponse.json({ contact, notes });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.organization !== undefined) updates.organization = body.organization;
  if (body.linkedinUrl !== undefined) updates.linkedinUrl = body.linkedinUrl;

  if (Object.keys(updates).length > 0) {
    await db.update(contacts).set(updates).where(eq(contacts.id, id));
  }

  const updated = await getContactById(id);
  return NextResponse.json(updated);
}
```

```typescript
// src/app/api/contacts/[id]/linkedin/route.ts
import { NextResponse } from 'next/server';
import { getContactById, updateContactLinkedIn, updateContactProfile } from '@/lib/db/queries';
import { scrapeLinkedInProfile } from '@/lib/integrations/lobstrio';
import { searchContactContext } from '@/lib/integrations/tavily';
import { normalizeContactProfile } from '@/lib/integrations/gemini';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { linkedinUrl } = await req.json();

  if (!linkedinUrl) return NextResponse.json({ error: 'LinkedIn URL required' }, { status: 400 });

  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Save URL
  await updateContactLinkedIn(id, linkedinUrl);

  // Scrape LinkedIn
  const lobstrData = await scrapeLinkedInProfile(linkedinUrl);

  // Run Tavily search if no existing research
  let tavilyData = null;
  if (!contact.researchData) {
    tavilyData = await searchContactContext(contact.name, contact.organization ?? undefined);
  }

  // Normalize with Gemini
  const profile = await normalizeContactProfile(lobstrData, tavilyData);

  // Store
  await updateContactProfile(id, {
    linkedinProfile: lobstrData,
    researchData: tavilyData ?? contact.researchData,
    profileSchema: profile,
  });

  return NextResponse.json({ success: true, profile });
}
```

- [ ] **Step 3: Create blocklist API routes**

```typescript
// src/app/api/blocklist/route.ts
import { NextResponse } from 'next/server';
import { getBlocklist, addToBlocklist } from '@/lib/db/queries';

export async function GET() {
  const entries = await getBlocklist();
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const { titlePattern } = await req.json();
  if (!titlePattern) return NextResponse.json({ error: 'Title pattern required' }, { status: 400 });

  const entry = await addToBlocklist(titlePattern);
  return NextResponse.json(entry);
}
```

```typescript
// src/app/api/blocklist/[id]/route.ts
import { NextResponse } from 'next/server';
import { removeFromBlocklist } from '@/lib/db/queries';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeFromBlocklist(id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add all API routes for meetings, contacts, and blocklist"
```

---

### Task 19: Home Page — Smart Calendar View

**Files:**
- Create: `src/app/page.tsx` (modify existing)
- Create: `src/app/components/meeting-card.tsx`
- Create: `src/app/components/linkedin-url-input.tsx`

- [ ] **Step 1: Create LinkedIn URL input component**

```tsx
// src/app/components/linkedin-url-input.tsx
'use client';
import { useState } from 'react';

interface LinkedInUrlInputProps {
  contactId: string;
  contactName: string;
  onSubmit?: () => void;
}

export function LinkedInUrlInput({ contactId, contactName, onSubmit }: LinkedInUrlInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      await fetch(`/api/contacts/${contactId}/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url }),
      });
      setDone(true);
      onSubmit?.();
    } catch (error) {
      console.error('Failed to submit LinkedIn URL:', error);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <span className="text-sm text-green-600">Profile created for {contactName}</span>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-2">
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder={`LinkedIn URL for ${contactName}`}
        className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Add'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create meeting card component**

```tsx
// src/app/components/meeting-card.tsx
import Link from 'next/link';
import { LinkedInUrlInput } from './linkedin-url-input';
import { ManualTriggerButton } from './manual-trigger-button';

interface MeetingCardProps {
  meeting: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    templateType: string;
    meetingMode: string;
    meetingType: string | null;
    prepStatus: string;
  };
  participants: { contact: { id: string; name: string; email: string; profileSchema: any }; participant: { isExternal: boolean } }[];
}

const typeBadgeColors: Record<string, string> = {
  investor: 'bg-purple-100 text-purple-700',
  partner: 'bg-blue-100 text-blue-700',
  customer: 'bg-green-100 text-green-700',
  internal: 'bg-gray-100 text-gray-700',
  other: 'bg-yellow-100 text-yellow-700',
};

const statusBadgeColors: Record<string, string> = {
  ready: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  generating: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
};

export function MeetingCard({ meeting, participants }: MeetingCardProps) {
  const startTime = new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(meeting.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const typeColor = typeBadgeColors[meeting.meetingType ?? 'other'] ?? typeBadgeColors.other;
  const statusColor = statusBadgeColors[meeting.prepStatus] ?? statusBadgeColors.pending;

  const newExternalContacts = participants.filter(
    p => p.participant.isExternal && !p.contact.profileSchema
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
      <Link href={`/meetings/${meeting.id}`} className="block">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{startTime} — {endTime}</p>
          </div>
          <div className="flex gap-2">
            {meeting.meetingType && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
                {meeting.meetingType}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {meeting.prepStatus}
            </span>
          </div>
        </div>
        <div className="flex gap-1 mt-3">
          {participants.map(p => (
            <span
              key={p.contact.id}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600"
              title={p.contact.name}
            >
              {p.contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
      </Link>

      {/* Generate button for meetings without prep packs */}
      {(meeting.prepStatus === 'pending' || meeting.prepStatus === 'failed') && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <ManualTriggerButton meetingId={meeting.id} currentStatus={meeting.prepStatus} />
        </div>
      )}

      {/* LinkedIn URL prompts for new contacts */}
      {newExternalContacts.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {newExternalContacts.map(p => (
            <LinkedInUrlInput
              key={p.contact.id}
              contactId={p.contact.id}
              contactName={p.contact.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build the home page**

```tsx
// src/app/page.tsx
import { getTodaysMeetings, getParticipantsForMeeting } from '@/lib/db/queries';
import { MeetingCard } from './components/meeting-card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const meetings = await getTodaysMeetings();

  const meetingsWithParticipants = await Promise.all(
    meetings.map(async (meeting) => {
      const participants = await getParticipantsForMeeting(meeting.id);
      return { meeting, participants };
    })
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Today's Meetings</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      {meetingsWithParticipants.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No meetings scheduled for today.</p>
          <p className="text-sm text-gray-400 mt-1">Meetings will appear here once the scheduler processes them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetingsWithParticipants.map(({ meeting, participants }) => (
            <MeetingCard
              key={meeting.id}
              meeting={{
                ...meeting,
                startTime: meeting.startTime.toISOString(),
                endTime: meeting.endTime.toISOString(),
              }}
              participants={participants}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/components/
git commit -m "feat: add smart calendar home page with meeting cards"
```

---

### Task 20: Meeting Detail View

**Files:**
- Create: `src/app/meetings/[id]/page.tsx`
- Create: `src/app/components/prep-pack-view.tsx`
- Create: `src/app/components/add-note-form.tsx`

- [ ] **Step 1: Create add note form component**

```tsx
// src/app/components/add-note-form.tsx
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
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Add Note'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create prep pack view component**

```tsx
// src/app/components/prep-pack-view.tsx
'use client';
import { useState } from 'react';
import type { PrepPack } from '@/types';

export function PrepPackView({ prepPack }: { prepPack: PrepPack }) {
  return (
    <div className="space-y-6">
      {/* Meeting Info */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Meeting Info</h2>
        <div className="rounded-md bg-gray-50 p-4">
          <p className="text-sm text-gray-700"><strong>Time:</strong> {prepPack.meetingInfo.time}</p>
          <p className="text-sm text-gray-700"><strong>Type:</strong> {prepPack.meetingInfo.inferredType}</p>
          {prepPack.meetingInfo.objective && (
            <p className="text-sm text-gray-700"><strong>Objective:</strong> {prepPack.meetingInfo.objective}</p>
          )}
          <p className="text-sm text-gray-700">
            <strong>Participants:</strong> {prepPack.meetingInfo.participants.map(p => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ')}
          </p>
        </div>
      </section>

      {/* Participant Profiles */}
      {prepPack.participantProfiles && prepPack.participantProfiles.length > 0 && (
        <CollapsibleSection title="Participant Profiles" defaultOpen>
          {prepPack.participantProfiles.map((profile, i) => (
            <div key={i} className="rounded-md bg-gray-50 p-4 mb-3">
              <p className="font-medium text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-600">{profile.currentRole} at {profile.company}</p>
              <p className="text-sm text-gray-700 mt-2">{profile.background}</p>
              {profile.highlights.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Highlights</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {profile.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Company Context */}
      {prepPack.companyContext && prepPack.companyContext.length > 0 && (
        <CollapsibleSection title="Company Context">
          {prepPack.companyContext.map((company, i) => (
            <div key={i} className="mb-3">
              <p className="font-medium text-gray-900">{company.name}</p>
              <p className="text-sm text-gray-700">{company.description}</p>
              {company.recentNews.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                  {company.recentNews.map((n, j) => <li key={j}>{n}</li>)}
                </ul>
              )}
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Prior Interactions */}
      <CollapsibleSection title="Prior Interactions" defaultOpen>
        <p className="text-sm text-gray-700">{prepPack.priorInteractionSummary}</p>
      </CollapsibleSection>

      {/* Last Touchpoint */}
      {prepPack.lastTouchpoint && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Last Touchpoint</h2>
          <p className="text-sm text-gray-700">
            <strong>{prepPack.lastTouchpoint.date}</strong> — {prepPack.lastTouchpoint.summary}
          </p>
        </section>
      )}

      {/* Materials */}
      {prepPack.materialsExchanged.length > 0 && (
        <CollapsibleSection title="Materials Exchanged">
          <ul className="space-y-1">
            {prepPack.materialsExchanged.map((m, i) => (
              <li key={i} className="text-sm text-gray-700">
                • {m.description} <span className="text-gray-400">({m.type})</span>
                {m.link && <a href={m.link} className="text-blue-600 ml-1 hover:underline" target="_blank" rel="noopener noreferrer">{m.link}</a>}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Open Loops */}
      {prepPack.openLoops.length > 0 && (
        <CollapsibleSection title="Open Loops" defaultOpen>
          <ul className="space-y-2">
            {prepPack.openLoops.map((loop, i) => (
              <li key={i} className="text-sm text-gray-700">
                <strong>{loop.item}</strong> — {loop.context}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Commitments */}
      {prepPack.commitments.length > 0 && (
        <CollapsibleSection title="Commitments" defaultOpen>
          <ul className="space-y-1">
            {prepPack.commitments.map((c, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium mr-1 ${c.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {c.by === 'us' ? 'WE' : 'THEY'} · {c.status}
                </span>
                {c.commitment}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Talking Points */}
      <CollapsibleSection title="Talking Points" defaultOpen>
        <ul className="list-disc list-inside space-y-1">
          {prepPack.talkingPoints.map((point, i) => (
            <li key={i} className="text-sm text-gray-700">{point}</li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Next Steps */}
      <CollapsibleSection title="Next-Step Checklist" defaultOpen>
        <ul className="space-y-1">
          {prepPack.nextStepChecklist.map((step, i) => (
            <li key={i} className="text-sm text-gray-700">☐ {step}</li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Data Gaps */}
      {prepPack.dataGaps && prepPack.dataGaps.length > 0 && (
        <p className="text-xs text-gray-400 italic">
          Data gaps: {prepPack.dataGaps.join(', ')}
        </p>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-lg font-semibold text-gray-900 mb-2"
      >
        {title}
        <span className="text-sm text-gray-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}
```

- [ ] **Step 3: Create meeting detail page**

```tsx
// src/app/meetings/[id]/page.tsx
import { getMeetingById, getParticipantsForMeeting, getNotesForMeeting } from '@/lib/db/queries';
import { PrepPackView } from '@/app/components/prep-pack-view';
import { AddNoteForm } from '@/app/components/add-note-form';
import { ManualTriggerButton } from '@/app/components/manual-trigger-button';
import { notFound } from 'next/navigation';
import type { PrepPack } from '@/types';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  if (!meeting) notFound();

  const participants = await getParticipantsForMeeting(id);
  const notes = await getNotesForMeeting(id);

  const startTime = meeting.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{startTime} · {meeting.meetingType ?? meeting.templateType}</p>
        </div>
        {meeting.prepStatus !== 'ready' && (
          <ManualTriggerButton meetingId={id} currentStatus={meeting.prepStatus} />
        )}
      </div>

      {meeting.prepContent ? (
        <PrepPackView prepPack={meeting.prepContent as PrepPack} />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            {meeting.prepStatus === 'generating' ? 'Generating prep pack...' :
             meeting.prepStatus === 'failed' ? 'Prep pack generation failed.' :
             'Prep pack not yet generated.'}
          </p>
        </div>
      )}

      {/* Manual Notes */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
        {notes.length > 0 ? (
          <div className="space-y-3 mb-4">
            {notes.map(note => (
              <div key={note.id} className="rounded-md bg-gray-50 p-3">
                <p className="text-sm text-gray-700">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {note.noteType.replace('_', ' ')} · {note.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <AddNoteForm meetingId={id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create manual trigger button component**

```tsx
// src/app/components/manual-trigger-button.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ManualTriggerButton({ meetingId, currentStatus }: { meetingId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleTrigger() {
    setLoading(true);
    try {
      await fetch(`/api/meetings/${meetingId}/generate`, { method: 'POST' });
      router.refresh();
    } catch (error) {
      console.error('Failed to trigger generation:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleTrigger}
      disabled={loading}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Generating...' : 'Generate Prep Pack'}
    </button>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/meetings/ src/app/components/prep-pack-view.tsx src/app/components/add-note-form.tsx src/app/components/manual-trigger-button.tsx
git commit -m "feat: add meeting detail view with prep pack display and manual notes"
```

---

### Task 21: Contacts Pages

**Files:**
- Create: `src/app/contacts/page.tsx`
- Create: `src/app/contacts/[id]/page.tsx`

- [ ] **Step 1: Create contacts list page**

```tsx
// src/app/contacts/page.tsx
import Link from 'next/link';
import { getAllContacts } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const contacts = await getAllContacts(search);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contacts</h1>

      <form className="mb-6">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search contacts..."
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </form>

      {contacts.length === 0 ? (
        <p className="text-gray-500">No contacts found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map(contact => {
            const profile = contact.profileSchema as any;
            return (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
              >
                <p className="font-medium text-gray-900">{contact.name}</p>
                <p className="text-sm text-gray-500">{contact.organization ?? contact.email}</p>
                {contact.lastInteractionAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last interaction: {new Date(contact.lastInteractionAt).toLocaleDateString()}
                  </p>
                )}
                {profile?.data_quality && (
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                    profile.data_quality === 'rich' ? 'bg-green-100 text-green-700' :
                    profile.data_quality === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {profile.data_quality} profile
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create contact detail page**

```tsx
// src/app/contacts/[id]/page.tsx
import { getContactById, getNotesForContact } from '@/lib/db/queries';
import { LinkedInUrlInput } from '@/app/components/linkedin-url-input';
import { notFound } from 'next/navigation';
import type { ContactProfileSchema } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) notFound();

  const notes = await getNotesForContact(id);
  const profile = contact.profileSchema as ContactProfileSchema | null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
      <p className="text-sm text-gray-500 mt-1">{contact.email}</p>
      {contact.organization && <p className="text-sm text-gray-500">{contact.organization}</p>}

      {/* LinkedIn URL */}
      <div className="mt-6">
        {contact.linkedinUrl ? (
          <a href={contact.linkedinUrl} className="text-sm text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {contact.linkedinUrl}
          </a>
        ) : (
          <LinkedInUrlInput contactId={id} contactName={contact.name} />
        )}
      </div>

      {/* Profile */}
      {profile && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Profile</h2>
            <p className="text-sm text-gray-700">{profile.profile_brief}</p>
            <p className="text-sm text-gray-600 mt-2">
              <strong>{profile.current_role}</strong> at <strong>{profile.current_company}</strong>
            </p>
            {profile.location && <p className="text-sm text-gray-500">{profile.location}</p>}
          </div>

          {profile.work_history.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Work History</h2>
              {profile.work_history.map((w, i) => (
                <div key={i} className="mb-2">
                  <p className="text-sm font-medium text-gray-800">{w.role} at {w.company}</p>
                  <p className="text-xs text-gray-500">{w.duration}</p>
                  {w.description_summary && <p className="text-sm text-gray-600">{w.description_summary}</p>}
                </div>
              ))}
            </div>
          )}

          {profile.company_context && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Company Context</h2>
              <p className="text-sm text-gray-700">{profile.company_context}</p>
            </div>
          )}

          {profile.key_skills.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Skills</h2>
              <div className="flex flex-wrap gap-1">
                {profile.key_skills.map((s, i) => (
                  <span key={i} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="mt-6">
        <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
        {notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="rounded-md bg-gray-50 p-3">
                <p className="text-sm text-gray-700">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">{note.noteType.replace('_', ' ')} · {note.createdAt.toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No notes yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/contacts/
git commit -m "feat: add contacts list and detail pages"
```

---

### Task 22: Blocklist + Settings Pages

**Files:**
- Create: `src/app/blocklist/page.tsx`
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Create blocklist page**

```tsx
// src/app/blocklist/page.tsx
import { getBlocklist } from '@/lib/db/queries';
import { BlocklistForm } from '@/app/components/blocklist-form';

export const dynamic = 'force-dynamic';

export default async function BlocklistPage() {
  const entries = await getBlocklist();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Blocklist</h1>
      <p className="text-sm text-gray-500 mb-4">Meetings with these exact titles will be excluded from prep pack generation.</p>

      <BlocklistForm entries={entries.map(e => ({ id: e.id, titlePattern: e.titlePattern }))} />
    </div>
  );
}
```

- [ ] **Step 2: Create blocklist form component**

```tsx
// src/app/components/blocklist-form.tsx
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
          className="flex-1 max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newPattern.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No entries yet.</p>
      ) : (
        <table className="w-full">
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className="border-b border-gray-100">
                <td className="py-3 text-sm text-gray-700">{entry.titlePattern}</td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="text-sm text-red-600 hover:text-red-700"
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
```

- [ ] **Step 3: Create settings page**

```tsx
// src/app/settings/page.tsx
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Morning Scan Time</label>
            <p className="text-sm text-gray-500 mt-1">
              Currently set to {process.env.MORNING_SCAN_HOUR ?? '7'}:00 AM (configured via MORNING_SCAN_HOUR env var)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sender Email</label>
            <p className="text-sm text-gray-500 mt-1">{process.env.SENDER_EMAIL ?? 'Not configured'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Recipient Email</label>
            <p className="text-sm text-gray-500 mt-1">{process.env.RECIPIENT_EMAIL ?? 'Not configured'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/blocklist/ src/app/settings/ src/app/components/blocklist-form.tsx
git commit -m "feat: add blocklist management and settings pages"
```

---

## Phase 4: Polish + Deploy

### Task 23: Add `createContact` Import Fix + Missing Imports Audit

- [ ] **Step 1: Audit all files for missing imports**

Check every file for import issues. Common ones:
- `src/scheduler/prep-trigger.ts` uses `createContact` — verify it's imported from queries
- `src/app/api/contacts/[id]/linkedin/route.ts` — verify all integration imports resolve
- `src/lib/pipeline/assemble-context.ts` — verify `createContact` import

Run: `npx tsc --noEmit`
Expected: No type errors (or fix any that appear).

- [ ] **Step 2: Fix any TypeScript errors**

Resolve all issues found by the type checker.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors and missing imports"
```

---

### Task 24: Add tsconfig paths for scheduler

**Files:**
- Modify: `tsconfig.json`
- Create: `tsconfig.scheduler.json`

- [ ] **Step 1: Create scheduler tsconfig**

The scheduler runs outside Next.js, so it needs its own tsconfig that resolves `@/*` paths:

```json
// tsconfig.scheduler.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/scheduler/**/*", "src/lib/**/*", "src/types/**/*"]
}
```

- [ ] **Step 2: Update package.json scheduler script**

```json
"scheduler": "tsx --tsconfig tsconfig.scheduler.json src/scheduler/index.ts"
```

- [ ] **Step 3: Verify scheduler starts**

```bash
npm run scheduler
```
Expected: Logs "Scheduler starting..." without import errors. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.scheduler.json package.json
git commit -m "feat: add scheduler tsconfig for standalone execution"
```

---

### Task 25: Production Readiness

- [ ] **Step 1: Update next.config to set output standalone**

```typescript
// next.config.ts (or next.config.mjs)
const nextConfig = {
  output: 'standalone',
};
export default nextConfig;
```

- [ ] **Step 2: Add Procfile or Railway start command**

Railway can use `start.sh` directly. Add to `package.json`:
```json
"start:prod": "bash start.sh"
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```
Expected: Build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts package.json
git commit -m "feat: production readiness — standalone output, start script"
```

---

### Task 26: End-to-End Verification

- [ ] **Step 1: Set up all environment variables in `.env.local`**

Fill in all credentials from the env vars checklist.

- [ ] **Step 2: Push DB schema**

```bash
npx drizzle-kit push
```

- [ ] **Step 3: Start the dashboard**

```bash
npm run dev
```
Navigate to `http://localhost:3000` — verify the home page loads.

- [ ] **Step 4: Start the scheduler in another terminal**

```bash
npm run scheduler
```
Verify it logs the cron schedule messages.

- [ ] **Step 5: Test with a real upcoming meeting**

Wait for a meeting within the next 25 minutes, or manually trigger via dashboard API:
```bash
curl -X POST http://localhost:3000/api/meetings/{meeting-id}/generate
```

- [ ] **Step 6: Verify prep email arrives in inbox**

Check that the HTML email renders correctly with all sections.

- [ ] **Step 7: Verify dashboard shows the meeting with prep pack**

Navigate to the meeting card on the home page, click through to detail view.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end verification complete"
```
