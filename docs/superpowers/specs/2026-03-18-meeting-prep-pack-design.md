# Meeting Prep Pack — Design Spec

## Overview

Automated meeting preparation system for Pushkar (Founder, Lemnisca). Monitors Google Calendar, assembles context from Gmail, LinkedIn (Lobstr.io), web search (Tavily), Fathom meeting notes, processes through Gemini Flash, delivers formatted prep emails 20 min before meetings. Dashboard provides smart calendar view with full prep packs.

## Architecture

**Two-process architecture on Railway:**
- **Process 1:** Next.js App Router — dashboard UI + API routes
- **Process 2:** Standalone scheduler — `node-cron` running morning scan + 5-min prep trigger
- **Shared:** Both processes import from `src/lib/` (DB client, integrations, pipeline logic)
- **Start script:** `start.sh` launches both processes
- **Local dev:** Both can run in a single process for convenience; two-process split is for production

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14+ (App Router, TypeScript) | Single codebase for API + dashboard |
| Database | Supabase (PostgreSQL) | Free tier, 500MB, dashboard for inspection |
| ORM | Drizzle | Type-safe queries, TS schema, auto migrations |
| LLM | Gemini Flash | Fast, free tier, sufficient for structuring tasks |
| Email send | Gmail API (self-send) | Already have OAuth, no external service needed |
| Email templates | React Email | React components rendered to HTML strings |
| LinkedIn data | Lobstr.io API | Dedicated LinkedIn scraper, structured JSON |
| Web search | Tavily API | LLM-ready parsed content, 1000 free credits/mo |
| Meeting notes | Fathom REST API | Free recordings, TypeScript SDK, structured data |
| Scheduler | node-cron | Persistent process on Railway |
| Deployment | Railway | Supports persistent processes, $5/mo |
| Styling | Tailwind CSS | Utility-first, fast dashboard development |

## Project Structure

```
meeting-prep/
├── docs/
├── src/
│   ├── app/                       # Next.js App Router (dashboard)
│   │   ├── page.tsx               # Smart calendar home
│   │   ├── meetings/[id]/page.tsx # Prep pack detail view
│   │   ├── contacts/              # Contacts list + detail
│   │   ├── blocklist/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/                   # API routes
│   │       ├── contacts/
│   │       ├── meetings/
│   │       └── blocklist/
│   ├── scheduler/                 # Separate entry point
│   │   ├── index.ts               # node-cron setup (both jobs)
│   │   ├── morning-scan.ts        # Daily new contact detection
│   │   └── prep-trigger.ts        # 5-min prep pack pipeline
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema (single source of truth)
│   │   │   ├── client.ts          # Drizzle + Supabase connection
│   │   │   └── queries.ts         # Reusable query functions
│   │   ├── google/
│   │   │   ├── auth.ts            # OAuth 2.0 client, token refresh
│   │   │   ├── calendar.ts        # Fetch events, extract participants
│   │   │   └── gmail.ts           # Search threads, fetch messages, send
│   │   ├── integrations/
│   │   │   ├── tavily.ts          # Web search for new contacts
│   │   │   ├── lobstrio.ts        # LinkedIn profile scraping
│   │   │   ├── fathom.ts          # Past meeting notes (API primary, Gmail fallback)
│   │   │   └── gemini.ts          # All LLM tasks
│   │   ├── pipeline/
│   │   │   ├── assemble-context.ts # Context gathering from all sources
│   │   │   ├── generate-prep.ts    # Gemini Flash prep pack generation
│   │   │   └── deliver-email.ts    # Template render + Gmail send
│   │   └── email/
│   │       ├── templates/
│   │       │   ├── internal-prep.tsx
│   │       │   ├── external-prep.tsx
│   │       │   └── new-contact-notification.tsx
│   │       └── render.ts          # React Email → HTML string
│   └── types/
│       └── index.ts               # Shared TypeScript types
├── drizzle/                       # Generated migrations
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── start.sh                       # Launches Next.js + scheduler
```

## Data Model (Drizzle Schema)

> **Convention:** DB columns use snake_case (PostgreSQL convention). Drizzle maps to camelCase TS properties.

### meetings_processed
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | Auto-generated |
| calendar_event_id | text, unique | Compound: `{eventId}_{YYYY-MM-DD}` to prevent duplicates |
| title | text | Meeting title from calendar |
| start_time | timestamp | Meeting start time |
| end_time | timestamp | Meeting end time (addition — useful for dashboard display) |
| template_type | enum(internal, external) | Based on participant domains |
| meeting_mode | enum(internal, external_first_time, external_repeat) | Determines pipeline path |
| meeting_type | enum(investor, partner, customer, internal, other), nullable | Auto-inferred by Gemini |
| prep_content | jsonb | Full generated prep pack (see PrepPack schema below) |
| prep_status | enum(pending, generating, ready, failed) | Tracks generation state |
| prep_sent_at | timestamp, nullable | When email was sent |
| calendar_description | text, nullable | Raw calendar event description (for objective extraction) |
| conference_link | text, nullable | Zoom/Meet/Teams link |
| created_at | timestamp | |

### contacts
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | |
| email | text, unique | Primary identifier |
| name | text | |
| organization | text, nullable | Derived from email domain (nullable for edge cases) |
| linkedin_url | text, nullable | Provided by Pushkar |
| linkedin_profile | jsonb, nullable | Raw Lobstr.io data processed by Gemini |
| research_data | jsonb, nullable | Raw Tavily web search results |
| profile_schema | jsonb, nullable | Clean unified contact profile (includes data_quality field) |
| first_seen_at | timestamp | |
| last_interaction_at | timestamp, nullable | |
| created_at | timestamp | |

### contact_notes
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | |
| contact_id | uuid, FK → contacts | |
| note_type | enum(pre_meeting, post_meeting, general) | |
| content | text | |
| meeting_id | uuid, FK → meetings_processed, nullable | |
| created_at | timestamp | |

### blocklist
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | |
| title_pattern | text | Exact match on meeting title |
| created_at | timestamp | |

### meeting_participants
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | |
| meeting_id | uuid, FK → meetings_processed | |
| contact_id | uuid, FK → contacts | |
| is_external | boolean | |

## Key TypeScript Types

```typescript
interface AssembledContext {
  meeting: { title: string; startTime: Date; endTime: Date; description?: string; conferenceLink?: string };
  participants: ParticipantContext[];
  meetingMode: 'internal' | 'external_first_time' | 'external_repeat';
  gmailContext: { participantEmail: string; summary: string; materials: MaterialLink[]; lastTouchpoint: { date: Date; summary: string } | null }[];
  fathomContext: { meetingDate: Date; summary: string; actionItems: string[]; decisions: string[] }[];
  manualNotes: { content: string; type: string; createdAt: Date }[];
  dataGaps: string[]; // tracks what failed/was unavailable
}

interface ParticipantContext {
  email: string;
  name: string;
  isExternal: boolean;
  isNewContact: boolean;
  profile?: ContactProfileSchema; // from DB for repeat, freshly generated for first-time
}

interface PrepPack {
  meetingInfo: { title: string; time: string; participants: { name: string; role?: string; org?: string }[]; inferredType: string; objective?: string };
  participantProfiles?: { name: string; currentRole: string; company: string; background: string; highlights: string[]; recentThemes: string[] }[];
  companyContext?: { name: string; description: string; stage?: string; size?: string; recentNews: string[] }[];
  priorInteractionSummary: string;
  lastTouchpoint: { date: string; summary: string } | null;
  materialsExchanged: { description: string; type: string; date?: string; link?: string }[];
  openLoops: { item: string; context: string; lastMentioned?: string }[];
  commitments: { commitment: string; by: 'us' | 'them'; status: 'pending' | 'delivered'; context?: string }[];
  talkingPoints: string[];
  nextStepChecklist: string[];
  dataGaps?: string[];
}

interface ContactProfileSchema {
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
  data_quality: 'rich' | 'moderate' | 'thin';
}

interface MaterialLink {
  description: string;
  type: 'attachment' | 'doc_link' | 'deck' | 'other';
  url?: string;
  date?: string;
}
```

## Three Meeting Modes

### Internal (all @lemnisca.bio)
- No participant research
- Context: Gmail threads (summarized), Fathom notes, manual notes
- Prep sections: 1, 4-10

### External — First-Time Contact
- Full research: Tavily + Lobstr.io (if URL provided) → Gemini normalizes → stored permanently
- Context: research + Gmail + Fathom + notes
- Prep sections: all 10, deep participant profile

### External — Repeat Contact
- No research, stored profile reused
- Context: stored profile + Gmail since last interaction + Fathom + notes
- Prep sections: all 10, brief profile reminder

## Pipeline Flow

```
assemble-context.ts
├── 1. parseParticipants()     → classify internal/external, check DB
├── 2. fetchGmailContext()     → search threads, Gemini summarizes [OPTIONAL - continues on failure]
├── 3. fetchFathomContext()    → API first, Gmail fallback [OPTIONAL - continues on failure]
├── 4. fetchResearchData()     → Tavily + Lobstr.io, first-time external only [OPTIONAL]
├── 5. loadDatabaseContext()   → stored profiles, manual notes [REQUIRED - fails pipeline if DB down]
└── returns AssembledContext (with dataGaps[] tracking failures)

generate-prep.ts
├── Takes AssembledContext
├── Single Gemini Flash call → PrepPack (10 sections)
├── Stores JSON in DB
└── returns PrepPack

deliver-email.ts
├── Takes PrepPack + meeting mode
├── Selects template (internal vs external)
├── Renders React Email → HTML string
├── Sends via Gmail API (self-send)
└── Marks meeting as processed
```

## Fathom Integration (Two-Path Strategy)

**Path A (Primary) — Direct API:**
- Generate API key on Fathom free plan
- `GET /external/v1/meetings` with participant email filter
- Returns: transcripts, AI summaries, action items, attendee lists
- Structured JSON — clean to process

**Path B (Fallback) — Gmail extraction:**
- If API is unavailable on free plan, search Gmail for Fathom summary emails
- Query: `from:notifications@fathom.video` + participant name/email
- Gemini Flash parses unstructured email HTML into structured meeting notes
- Less reliable but functional — Gemini handles unstructured text well

**Implementation:** `fathom.ts` exports a single `fetchMeetingNotes(participantEmails)` function. Internally tries Path A first; if it gets a 401/403, falls back to Path B and logs the switch. The consumer (pipeline) doesn't know which path was used.

## Gemini Flash — LLM Tasks

`gemini.ts` handles four distinct LLM calls:

1. **`normalizeContactProfile(lobstrData, tavilyData)`** — Raw Lobstr.io + Tavily → ContactProfileSchema. Runs once per new contact.
2. **`summarizeGmailThreads(threads[])`** — Raw Gmail threads → summary + extracted materials/links + last touchpoint. Runs per participant per meeting.
3. **`inferMeetingType(participants, calendarDescription)`** — Returns investor/partner/customer/internal/other. Runs once per meeting.
4. **`generatePrepPack(assembledContext)`** — All context → 10-section PrepPack JSON. Single call per meeting. This is the main call.

## Scheduler Jobs

**Job 1 — Morning scan (daily, 7:00 AM):**
1. Fetch today's calendar events
2. Extract external participants
3. Check each against contacts DB
4. For unknown: create placeholder record, send notification email

**Job 2 — Prep trigger (every 5 minutes):**
1. Fetch events starting in next 25 minutes
2. Skip if processed (by calendar_event_id) or blocklisted
3. Classify meeting mode
4. Run context assembly pipeline
5. Generate prep pack via Gemini Flash
6. Store prep pack JSON
7. Send email via Gmail API
8. Mark as processed

## New Contact Notification Email

When the morning scan finds unknown external participants, it sends a notification email:
- **To:** aryan.jakhar@lemnisca.bio (self-send)
- **Subject:** `New contact today: {Name} from {Company} — confirm LinkedIn`
- **Content:** "You're meeting {Name} from {Company} today at {time}. Confirm their LinkedIn URL so we can build a profile."
- **CTA:** Link to `{dashboard_url}/contacts/{id}` where the LinkedIn URL input field is displayed
- **Template:** `new-contact-notification.tsx`

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/meetings` | Today's meetings with prep status |
| GET | `/api/meetings/[id]` | Full meeting detail + prep pack |
| POST | `/api/meetings/[id]/generate` | Manual prep pack trigger (skips blocklist) |
| POST | `/api/meetings/[id]/notes` | Add manual note to meeting |
| GET | `/api/contacts` | List all contacts (supports `?search=` query) |
| GET | `/api/contacts/[id]` | Full contact profile |
| PUT | `/api/contacts/[id]` | Update contact (LinkedIn URL, notes) |
| POST | `/api/contacts/[id]/linkedin` | Submit LinkedIn URL → triggers Lobstr.io + profile generation |
| GET | `/api/blocklist` | List all blocklist entries |
| POST | `/api/blocklist` | Add title pattern |
| DELETE | `/api/blocklist/[id]` | Remove blocklist entry |

## Dashboard Pages

- **`/`** — Today's meetings as chronological cards. Each card: time, title, participant initials, type badge (investor/partner/customer/internal), prep status badge (pending/ready/failed/no data). "Generate" button on cards without prep packs. New contacts show LinkedIn URL input inline. Click card → detail view.
- **`/meetings/[id]`** — Full prep pack with expandable sections. Manual notes input. "Generate Prep Pack" button for manual trigger (skips blocklist — if Pushkar explicitly wants it, respect that). Richer than email — clickable links, full excerpts.
- **`/contacts`** — Grid of all contacts with search. Shows name, org, last interaction, data quality indicator.
- **`/contacts/[id]`** — Full profile, LinkedIn URL input, research data, notes history.
- **`/blocklist`** — Simple table of patterns with add form and delete buttons.
- **`/settings`** — Morning scan time, notification preferences.

## Email Delivery

- **Send method:** Gmail API `messages.send()` — self-send from aryan.jakhar@lemnisca.bio
- **Templates:** React Email components rendered to HTML strings
- **Template selection:** Any non-@lemnisca.bio participant → external template
- **Subject format:** `Prep Pack: {title} — {time}`
- **No DNS/SPF/DKIM needed** — sending to self via own Gmail account

## Error Handling

- Steps 2-4 in the pipeline are optional — if any integration fails, pipeline continues with available data
- `dataGaps` array in AssembledContext and PrepPack tracks what was unavailable
- Gemini Flash adapts — generates best prep pack from whatever context was assembled
- Google auth failure: no prep packs sent, obvious failure mode, manual re-auth
- Fathom: automatic fallback from API to Gmail extraction

## Environment Variables

```
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

## Deployment

- **Production:** Railway auto-deploy from GitHub main branch
- **Custom domain:** `prep.lemnisca.bio`
- **Env vars:** Configured in Railway dashboard
- **Process:** `start.sh` launches Next.js server + scheduler as separate processes

## External Services

| Service | Free Tier | Monthly Cost |
|---------|-----------|-------------|
| Google Cloud (Calendar + Gmail) | Free at volume | $0 |
| Gemini Flash (AI Studio) | Generous free tier | $0 |
| Tavily | 1,000 credits/mo | $0 |
| Lobstr.io | 30 results/export | $0 |
| Fathom | Unlimited recordings + API | $0 |
| Supabase | 500MB DB | $0 |
| Railway | Trial, then $5/mo | $5 |

**Total: ~$5/month**
