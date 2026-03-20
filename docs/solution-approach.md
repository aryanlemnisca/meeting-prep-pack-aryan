# Solution Design Doc — Meeting Prep Pack

## 1. Architecture Overview

The Meeting Prep Pack is a background service with a smart calendar dashboard. The system runs two cron jobs: a daily morning scan for new contacts and an every-5-minutes prep pack trigger. It assembles context from multiple sources, processes everything through Gemini Flash, and delivers formatted prep emails.

**High-level flow:**
```
[Morning Scan Cron] → [New Contact Detection] → [Notification Email to Pushkar]
                                                         ↓
                                              [Pushkar provides LinkedIn URL]
                                                         ↓
                                              [Lobstr.io + Tavily + Gemini Flash → Contact Profile → DB]

[5-Min Prep Cron] → [Calendar Check] → [Context Assembly] → [Gemini Flash] → [Email Delivery]
                                              ↓
                            [Gmail] [Tavily] [Lobstr.io] [Fathom] [DB: Contacts/Notes/Blocklist]
```

**Dashboard:** Smart calendar view — today's meetings as cards, click to view full prep pack. Also provides controls for blocklist, contact management, manual notes, and LinkedIn URL input.

---

## 2. Tech Stack

### Framework: Next.js 14+ (TypeScript, App Router)
**Why:** Single codebase for API routes (backend logic) and React dashboard (frontend). TypeScript gives type safety across the full stack. Next.js is the strongest framework for Claude Code — fast scaffolding, clear conventions, and extensive ecosystem. App Router with server actions simplifies the API layer.

### Deployment: Railway
**Why this over Vercel:** The core product requirement is a scheduler that checks the calendar every 5 minutes. Vercel's Hobby plan restricts cron jobs to once per day. Railway supports persistent long-running processes natively — we can use `node-cron` directly in the application without external dependencies.

**Railway specifics:**
- Persistent Node.js process with `node-cron` for scheduling
- Auto-deploy from GitHub
- $5/month after trial
- Built-in environment variable management
- Custom domain support

### Database: Supabase (PostgreSQL)
**Why:** Free tier provides a full PostgreSQL database with 500MB storage — more than sufficient for a single-user tool. Clean JavaScript client, dashboard for quick data inspection during development.

**What we store:**
- Contact profiles (LinkedIn data, web research, narrative brief — cached permanently)
- Prep packs (generated JSON — cached per meeting, served on subsequent views)
- Blocklist entries
- Manual notes (pre-meeting and post-meeting)
- Processed meeting log
- Meeting participants mapping

### LLM: Gemini Flash (all tasks)
**Why Gemini Flash for everything:** The LLM's job in this product is organizing and formatting data that's already been gathered by other services. No heavy reasoning needed. Gemini Flash is fast, cheap, and sufficient for: normalizing LinkedIn profiles, summarizing Gmail threads, inferring meeting types, extracting materials/links from threads, and generating the final prep pack.

**Tasks:**
- Lobstr.io + Tavily raw data → clean contact profile schema with narrative brief
- Gmail threads → summarized key points + extracted materials/links
- Meeting type inference from participant domains and context
- Meeting objective extraction from calendar description
- Final prep pack generation (all 10 sections)

**Cost:** Google AI Studio free tier has generous limits for Flash. Effectively $0 at our volume.

### Email Delivery: Gmail API + React Email
**Why Gmail API for sending:** Eliminates the need for any external email service (Resend, etc.) and DNS verification. Since we already have OAuth access to Gmail for reading threads, adding the `gmail.send` scope lets us send emails directly. The prep pack email is sent from the user's own account to themselves — zero spam risk, lands naturally in inbox, no new service needed.

**Current setup:** aryan.jakhar@lemnisca.bio sends to self (testing). Later migrates to Pushkar's account sending to himself.

**Why React Email still:** We use React Email purely as a rendering library — build HTML email templates as React components, render them to an HTML string, then pass that string to Gmail API's `messages.send()`. Same great templating DX without the Resend dependency.

**No DNS verification needed.** No SPF/DKIM setup. No external email service account.

### Web Search: Tavily Search API
**Why Tavily:** Built for AI/LLM applications. Returns parsed, LLM-ready content from up to 20 sources per query. Cannot scrape LinkedIn directly (tested — fails), so LinkedIn is handled separately by Lobstr.io.

**Usage:** Only for first-time external participants. Searches "[Person Name] [Company from email domain]" for general context — company info, news, public bios. Results stored permanently.

**Pricing:** 1,000 free API credits/month. Minimal usage since research only runs for new contacts.

### LinkedIn Data: Lobstr.io API
**Why Lobstr.io:** LinkedIn profiles are the richest source of structured professional context. Tavily and other web search tools cannot extract LinkedIn pages (LinkedIn blocks them). Lobstr.io provides a dedicated LinkedIn Profile Scraper API returning structured JSON.

**What we get per API call:** Full name, headline, current title/company, complete work history, education, about section, skills, certifications, featured posts, recent activity.

**Why Pushkar provides the URL manually:** Web search may find multiple LinkedIn profiles for common names. Pushkar confirming the correct URL takes 5 seconds and eliminates wrong-person risk.

**Why not other tools:**
- Proxycurl — shut down by LinkedIn lawsuit (July 2025)
- Tavily extract — tested, fails on LinkedIn URLs
- PhantomBuster — expensive ($69/month), session-cookie based

**Pricing:** Free tier allows 30 results per export. One profile at a time for new contacts only — free tier likely sufficient.

### Meeting Notes: Fathom (REST API)
**Why Fathom:** Best meeting notetaker option after researching Fireflies ($19-29/month API), Otter.ai (no API), tl;dv ($59-98/month API). Fathom has unlimited free recordings, well-documented REST API with TypeScript SDK, and rich structured data.

**Two-path integration:**
- **Path A (Primary):** Direct API access. Generate API key on free plan, query meetings by participant email. Returns transcripts, summaries, action items.
- **Path B (Fallback):** Gmail-based extraction. Fathom emails meeting summaries to Pushkar's Gmail. Our system searches Gmail for Fathom emails mentioning the relevant participant. AI parses the email content.

**Key API endpoints (Path A):**
- `GET /external/v1/meetings` — list meetings with filters
- `include_transcript=true` — full transcript with speaker attribution
- `default_summary` — AI-generated summary in markdown
- `action_items` — extracted with assignees and timestamps
- `calendar_invitees` — attendee list with internal/external flag

### Google APIs: Calendar API + Gmail API
**Authentication:** OAuth 2.0 with offline access. One-time authorization flow, refresh token stored in environment variables. No multi-user auth system.

**Calendar API:** Fetch upcoming events, extract title, time, attendees, description, conference link.

**Gmail API:** Search threads by participant email, fetch messages with metadata, extract attachments/links referenced in threads.

---

## 3. Three Meeting Modes

### 3.1 Internal Meetings (all participants @lemnisca.bio)
**No participant research.** Pushkar knows his team.

**Context gathered:**
- Gmail threads with attendees (summarized, materials/links extracted)
- Fathom past meeting notes (summaries, action items)
- Manual notes from database

**Prep pack sections:** Meeting info, prior interaction summary, last touchpoint, materials & links exchanged, open loops, commitments, talking points, next-step checklist.

### 3.2 External — First-Time Contact
**Trigger:** External participant NOT in contacts database.

**Full research runs once:**
- Tavily web search → company/general context
- Lobstr.io LinkedIn scrape (if Pushkar provided URL via morning flow or dashboard) → Gemini Flash normalizes into clean schema
- All research stored permanently as contact profile

**Prep pack sections:** All 10 sections including deep participant profile and company context.

### 3.3 External — Repeat Contact
**Trigger:** External participant IS in contacts database.

**No research. Stored profile reused.**

**Context gathered:**
- Stored contact profile from DB
- Gmail threads since last interaction
- Fathom meeting notes from all past meetings
- Manual notes

**Prep pack sections:** All 10 sections but participant profile is a brief reminder from cached data. Bulk of pack is relationship state — open loops, commitments, interaction history.

---

## 4. Contact Profile Schema

Gemini Flash normalizes Lobstr.io + Tavily raw data into this clean schema:

```json
{
  "name": "string",
  "headline": "string",
  "current_role": "string",
  "current_company": "string",
  "location": "string",
  "about_summary": "string (AI-condensed)",
  "work_history": [
    { "role": "string", "company": "string", "duration": "string", "description_summary": "string" }
  ],
  "education": [
    { "institution": "string", "degree": "string", "field": "string", "years": "string" }
  ],
  "key_skills": ["string"],
  "recent_activity_themes": ["string (topics they post/talk about)"],
  "company_context": "string (what the company does, stage, size — from Tavily)",
  "notable_mentions": ["string (news, talks, articles from web search)"],
  "profile_brief": "string (3-4 sentence narrative summary)",
  "data_quality": "rich | moderate | thin"
}
```

**Handling thin data:** If Lobstr.io returns mostly null fields (locked-down profile), Gemini Flash still produces a usable output from whatever's available — headline, company, Tavily results. `data_quality` is set to "thin" so the prep pack adapts and shows less profile context without breaking.

---

## 5. Major Components

### 5.1 Scheduler Service
**Technology:** `node-cron` in the main Node.js process on Railway.

**Job 1 — Daily morning scan (runs once, early morning):**
```
1. Fetch today's calendar events
2. Extract all external participants
3. Check each against contacts DB
4. For unknown contacts:
   a. Create a placeholder contact record
   b. Send notification email to Pushkar: "Confirm LinkedIn URL for [Name] from [Company]"
   c. Email links to dashboard contact page
```

**Job 2 — Prep pack trigger (every 5 minutes):**
```
1. Fetch calendar events starting in the next 25 minutes
2. For each event:
   a. Skip if already processed (lookup by event ID + date)
   b. Skip if title matches blocklist
   c. Determine meeting mode (internal / external-first / external-repeat)
   d. Run context assembly pipeline
   e. Generate prep pack via Gemini Flash
   f. Store prep pack JSON in DB
   g. Send email via Gmail API (self-send)
   h. Mark as processed
```

### 5.2 Context Assembly Pipeline

**Step 1: Parse participants**
- Extract attendee list from calendar event
- Classify internal (@lemnisca.bio) vs external
- Check contacts DB: known or new?
- Determine meeting mode

**Step 2: Gmail thread search (all modes)**
- Search Gmail for threads per participant email
- Gemini Flash summarizes threads, extracts materials/links/attachments

**Step 3: Fathom meeting notes (all modes)**
- Path A: Query Fathom API for past meetings with these participants
- Path B: Search Gmail for Fathom summary emails mentioning participants
- Extract: summaries, action items, decisions

**Step 4: Research for first-time external contacts only**
- Tavily web search: "[Name] [Company from email domain]" → general context
- If LinkedIn URL provided: Lobstr.io API scrape → Gemini Flash normalizes into contact profile schema
- Store complete profile permanently in DB

**Step 5: Database context (all modes)**
- Load stored contact profiles for known external participants
- Load manual notes
- Load meeting type tag if set

### 5.3 Prep Pack Generation (Gemini Flash)
Single Gemini Flash call per meeting. Input: all assembled context. Output: structured prep pack with 10 sections.

**The prompt instructs Gemini Flash to:**
- Auto-infer meeting type from participant domains and context
- Extract meeting objective from calendar description if present
- Synthesize prior interactions into a narrative (not a list of emails)
- Identify the most recent touchpoint with date
- List materials and links exchanged in past threads
- Surface open loops and unresolved items
- Track commitments by either side
- Generate contextually relevant talking points
- Produce a next-step checklist of recommended outcomes

**Output stored as JSON in `meetings_processed.prep_content`.**

### 5.4 Email Delivery
**Two React Email templates rendered to HTML strings:**
- `InternalPrepEmail` — sections 1, 4-10
- `ExternalPrepEmail` — all 10 sections (profile depth varies by first-time vs repeat)

```typescript
// Render React Email to HTML string
const html = render(ExternalPrepEmail({ ...prepData }));

// Send via Gmail API (self-send)
await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: createEmailRaw({
      from: 'aryan.jakhar@lemnisca.bio',
      to: 'aryan.jakhar@lemnisca.bio',
      subject: `Prep Pack: ${meetingTitle} — ${meetingTime}`,
      html
    })
  }
});
```

### 5.5 Dashboard
**Technology:** Next.js App Router + Tailwind CSS. Polished UI.

**Pages:**
- `/` — Smart calendar home. Today's meetings as chronological cards. Each card: time, title, participants (initials/avatars), type badge (investor/partner/customer/internal), prep status (ready/pending/no data). For new contacts: LinkedIn URL prompt on card. Click card → full prep pack.
- `/meetings/[id]` — Full prep pack detail view (richer than email). Manual notes and doc links can be added here. Notes added post-generation show alongside cached pack.
- `/blocklist` — Add/remove meeting titles to exclude.
- `/contacts` — All known contacts with stored profiles, LinkedIn URLs, notes.
- `/contacts/[id]` — Full contact profile view. Add LinkedIn URL, manual notes.
- `/settings` — Preferences.

**Manual trigger:** Dashboard allows Pushkar to manually trigger prep pack generation for any meeting (not just wait for the 20-minute cron).

---

## 6. Data Model

### meetings_processed
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | |
| calendar_event_id | text | Unique per date to prevent duplicates |
| title | text | Meeting title from calendar |
| start_time | timestamp | Meeting start time |
| template_type | enum | internal, external |
| meeting_mode | enum | internal, external_first_time, external_repeat |
| meeting_type | enum, nullable | investor, partner, customer, internal, other (auto-inferred) |
| prep_content | jsonb | Full generated prep pack — cached, served on views |
| prep_sent_at | timestamp | When email was sent |
| created_at | timestamp | |

### contacts
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | |
| email | text, unique | Primary identifier |
| name | text | |
| organization | text | Derived from email domain |
| linkedin_url | text, nullable | Provided by Pushkar |
| linkedin_profile | jsonb | Lobstr.io data processed by Gemini Flash — stored permanently |
| research_data | jsonb | Tavily web search results — stored permanently |
| profile_schema | jsonb | Clean contact profile schema (the unified output) — stored permanently |
| first_seen_at | timestamp | |
| last_interaction_at | timestamp | |
| created_at | timestamp | |

### contact_notes
| Column | Type | Description |
|--------|------|-------------|
| id | uuid, PK | |
| contact_id | uuid, FK → contacts | |
| note_type | enum | pre_meeting, post_meeting, general |
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

---

## 7. Processing Flow (End-to-End)

```
MORNING SCAN (daily)
│
├─ Fetch today's calendar events
├─ Identify external participants not in contacts DB
├─ For each unknown contact:
│   ├─ Create placeholder record in DB
│   └─ Send notification email with dashboard link for LinkedIn URL
│
─────────────────────────────────────────────────────

PREP TRIGGER (every 5 min)
│
├─ Fetch calendar events (next 25 min window)
├─ For each event:
│   ├─ Skip if processed or blocklisted
│   ├─ Classify meeting mode
│   │
│   ├─ [ALL] Gmail search → Gemini Flash summarizes + extracts materials/links
│   ├─ [ALL] Fathom API or Gmail → past meeting summaries + action items
│   ├─ [ALL] Database → manual notes, doc links
│   │
│   ├─ [FIRST-TIME EXTERNAL] Tavily → company/general context
│   ├─ [FIRST-TIME EXTERNAL] Lobstr.io → LinkedIn profile (if URL provided)
│   ├─ [FIRST-TIME EXTERNAL] Gemini Flash → normalize into contact profile schema → store in DB
│   │
│   ├─ [REPEAT EXTERNAL] Load stored contact profile from DB
│   │
│   ├─ Gemini Flash → generate 10-section prep pack
│   ├─ Store prep pack JSON in DB
│   ├─ Render React Email template
│   ├─ Send via Gmail API (self-send)
│   └─ Mark as processed, update last_interaction_at
```

---

## 8. API Credentials & External Services

| Service | What's Needed | Free Tier | Cost |
|---------|--------------|-----------|------|
| Google Cloud | OAuth 2.0 (Calendar + Gmail read + Gmail send) | Free at our volume | $0 |
| Gemini | API key from Google AI Studio | Generous free tier for Flash | $0 |
| Tavily | API key | 1,000 credits/month | $0 |
| Lobstr.io | API key | 30 results/export (free) | $0 |
| Fathom | API key (test free plan) | Unlimited recordings | $0 (fallback: Gmail) |
| Supabase | Project URL + anon key | 500MB DB | $0 |
| Railway | Account + project | Trial, then $5/month | $5/month |

**Total monthly cost: ~$5/month.** Seven services, six of them free.

---

## 9. Deployment

### Development
- Local Next.js dev server (`next dev`)
- `node-cron` in same process for local testing
- Supabase cloud database (same instance for dev and prod)
- `.env.local` for all credentials

### Production
- Push to company GitHub → Railway auto-deploys from main branch
- Custom domain: `prep.lemnisca.bio`
- Environment variables in Railway dashboard
- `node-cron` runs as part of persistent Node.js process

### Setup steps:
1. Supabase project + run migrations
2. Google Cloud Console: OAuth credentials (Calendar + Gmail read + Gmail send scopes)
3. One-time OAuth flow → store Aryan's refresh token (later migrate to Pushkar)
4. Tavily API key
5. Lobstr.io API key
6. Fathom account + test API key on free plan
7. Google AI Studio: Gemini API key
8. Push to GitHub → Railway deploy → configure env vars
9. Test with a real upcoming meeting

---

## 10. Known Tradeoffs

**1. Railway over Vercel** — Lose edge optimization, gain persistent process for scheduler. Irrelevant for single-user internal tool.

**2. One-time research, never refreshed** — Contact profiles may go stale if someone changes roles. Pushkar can manually update on dashboard. Keeps system simple and API usage minimal.

**3. Fathom two-path strategy** — Uncertain if free plan includes API. Gmail fallback parses email HTML instead of clean JSON. AI handles unstructured text well. Product works either way.

**4. Single Google refresh token** — If revoked, system stops. Auth failure would be obvious (no prep packs sent). Re-auth is manual but infrequent.

**5. No real-time calendar sync** — 5-minute polling, not webhooks. Meeting added with <5 min notice might miss the window. Extremely unlikely for scheduled meetings.

**6. Prep packs are immutable snapshots** — Generated once, not regenerated when notes are added. Manual notes show alongside cached pack on dashboard. Simpler, fewer API calls.

**7. LinkedIn URL requires manual confirmation** — Adds 5 seconds of Pushkar's time per new contact but eliminates wrong-person risk entirely.

---

## 11. Build Order (Claude Code friendly)

**Phase 1: Foundation**
1. Scaffold Next.js 14+ project with TypeScript, App Router, Tailwind CSS
2. Set up Supabase project, create all tables with migrations
3. Set up Google OAuth flow, store refresh token
4. Verify Calendar API (fetch upcoming events)
5. Verify Gmail API (search threads by email)

**Phase 2: Core Pipeline**
6. Build node-cron scheduler (both jobs: morning scan + 5-min trigger)
7. Build morning scan: detect new contacts, send notification emails via Gmail API
8. Build context assembly pipeline with three meeting mode paths
9. Build Tavily integration for web search
10. Build Lobstr.io integration for LinkedIn profile scraping
11. Build Gemini Flash integration: contact profile normalization, thread summarization, prep pack generation
12. Build React Email templates (internal + external) → render to HTML strings
13. Build Gmail API email sending (self-send: aryan.jakhar@lemnisca.bio to self)
14. End-to-end test: real meeting → prep email in inbox

**Phase 3: Dashboard**
15. Build smart calendar home page with meeting cards
16. Build meeting detail view with full prep pack
17. Build LinkedIn URL input flow on cards + contact pages
18. Build blocklist management
19. Build contacts page with stored profiles
20. Build manual notes input (shows alongside cached prep pack)
21. Build manual prep pack trigger from dashboard

**Phase 4: Fathom + Polish**
22. Test Fathom free plan API access
23. If API works: integrate into context assembly pipeline
24. If blocked: implement Gmail-based Fathom email extraction
25. UI polish across dashboard
26. Deploy to Railway with custom domain