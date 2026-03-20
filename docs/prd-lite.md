# PRD-Lite — Meeting Prep Pack

## Problem Statement
Pushkar spends significant recurring effort before every important meeting manually gathering context from Gmail, calendar, past conversations, shared materials, and memory. This process is inconsistent — quality depends on available time — and fragile — open loops, prior commitments, exchanged materials, and relationship context regularly get missed. There is no system that automatically assembles meeting context and delivers it in a ready-to-consume format when it's needed.

## Why Now
Lemnisca is in an active phase of fundraising, partnership development, and customer conversations. The volume and stakes of Pushkar's external meetings are high. Every missed follow-up or forgotten commitment in an investor or partner meeting has tangible cost. A tool that automates prep and surfaces hidden context has immediate compounding leverage.

## Core Use Case
Before every meeting on Pushkar's calendar, he automatically receives a well-structured prep email containing participant context, relationship history, materials exchanged, open loops, commitments, and suggested talking points — assembled from calendar data, Gmail threads, LinkedIn profiles, web research, and meeting notes. No manual gathering required. A dashboard provides a smart calendar view of today's meetings with full prep packs accessible on click.

## MVP Scope

### Calendar Integration
- Connect to Pushkar's Google Calendar via API
- Monitor upcoming events continuously (every 5 minutes)
- Trigger prep pack generation 20 minutes before each event
- Extract event title, time, participants (name + email), description/notes, conference link
- Daily morning scan for new external contacts on today's calendar

### Gmail Integration
- For each participant, search Gmail for prior threads using their email address
- Pull relevant thread history for synthesis
- Extract materials sent/received: attachments referenced, doc links shared, deck mentions
- Identify most recent interaction (last touchpoint date + summary)

### LinkedIn Data (Lobstr.io)
- For first-time external contacts, Pushkar provides the LinkedIn URL via dashboard
- Lobstr.io API scrapes the full profile: work history, education, about section, skills, recent posts
- Gemini Flash normalizes raw Lobstr.io data into a clean contact profile schema
- Profile stored permanently in database — never re-scraped for repeat contacts

### Web Search (Tavily)
- For first-time external contacts, run web search for company and general context
- Pulls: company info, recent news, public bios, conference appearances
- Combined with LinkedIn data by Gemini Flash into a unified contact profile
- Results stored permanently — no repeat searches for known contacts

### Meeting Notes (Fathom)
- Fathom auto-joins and records Pushkar's meetings (Zoom, Google Meet, Teams)
- Path A: Fathom API to query past meeting transcripts, summaries, and action items by participant email
- Path B (fallback): Search Gmail for Fathom summary emails if API is blocked on free plan
- Meeting notes provide critical context for repeat contacts: what was discussed, decided, and committed

### LLM Processing (Gemini Flash — all tasks)
- **Contact profile creation:** Normalize Lobstr.io + Tavily raw data into clean structured schema with narrative brief
- **Gmail summarization:** Condense thread history into key points, extract materials/links exchanged
- **Meeting type inference:** Auto-tag meetings as investor/partner/customer/internal from participant domains and context
- **Prep pack generation:** Assemble all context into the final structured prep brief

### Prep Pack Structure (email + dashboard)
1. **Meeting info** — title, time, participants, auto-inferred type, objective from calendar description
2. **Participant profiles** (external only) — current role, company, background, career highlights, recent activity themes. Deep for first-time, brief reminder for repeat.
3. **Company context** (external only) — what they do, stage, size, recent news
4. **Prior interaction summary** — synthesized narrative across email threads and past meeting notes
5. **Last touchpoint** — date and summary of most recent interaction
6. **Materials & links exchanged** — attachments, docs, decks referenced in past email threads
7. **Open loops** — unresolved items from past conversations
8. **Commitments tracker** — promises by either side, delivered or not
9. **Talking points** — contextually relevant questions and topics
10. **Next-step checklist** — recommended outcomes to aim for

### Email Delivery
- Deliver prep pack as HTML-formatted email 20 minutes before each meeting
- Sender: aryan.jakhar@lemnisca.bio (temporary, migrates to Pushkar's email later)
- Two templates:
  - **Internal template** (all participants @lemnisca.bio): sections 1, 4-10. No participant profiles or company research.
  - **External template** (any non-lemnisca.bio participant): all 10 sections.
- Trigger logic: if even one participant has a non-lemnisca.bio email, use external template

### Dashboard
- **Home page (smart calendar view):** Today's meetings as chronological cards. Each card shows time, title, participants, type badge, prep status. Click any card → full prep pack view.
- **New contact prompt:** Cards for meetings with unknown external contacts show LinkedIn URL input prompt. Submit URL → Lobstr.io scrapes → profile generated → prep pack loads.
- **Prep pack detail view:** Full prep pack rendered richer than email — expandable sections, clickable links, full thread excerpts when needed.
- **Manual notes:** Add notes or doc/deck links from the meeting detail view. Notes added after prep generation show alongside the cached pack, do not trigger regeneration.
- **Blocklist:** Add/remove meeting titles to exclude from prep generation.
- **Contacts:** All known contacts with stored profiles, LinkedIn URLs, notes history.
- **Settings:** Preferences and configuration.

### Caching Strategy
- Prep packs are generated once per meeting and stored as JSON in the database
- All subsequent views (dashboard, email re-read) serve the cached version
- No redundant API calls — contact profiles, research data, and prep packs are all stored after first generation
- Manual notes added post-generation show alongside the cached pack on the dashboard

### New Contact Flow
- Daily morning scan identifies unknown external participants on today's calendar
- System sends notification email: "You're meeting [Name] from [Company] today — confirm their LinkedIn URL"
- Email links to dashboard where Pushkar pastes URL
- On dashboard: meeting card shows LinkedIn URL prompt for new contacts
- After URL submitted: Lobstr.io scrapes, Gemini Flash processes, profile stored, prep pack generates

## Non-Goals
- No full CRM or relationship management platform
- No automated LinkedIn scraping without Pushkar confirming the URL
- No AI persuasion or negotiation strategy
- No handling of every meeting edge case (cancellations, rescheduling, multi-timezone logic)
- No multi-user support or authentication system
- No support for calendar systems other than Google Calendar
- No contact profile refresh logic — stored profiles are permanent until manually updated
- No prep pack regeneration when manual notes are added after generation
- No full email thread reproduction — synthesis only

## Acceptance Criteria

### Email Delivery
- [ ] Prep email arrives in Pushkar's inbox approximately 20 minutes before a real calendar event
- [ ] Email does not fire for meetings on the blocklist
- [ ] Internal and external templates trigger correctly based on participant domains

### Prep Pack Quality
- [ ] All participants are correctly identified with name and organization
- [ ] Meeting type is auto-inferred (investor/partner/customer/internal)
- [ ] Meeting objective is pulled from calendar description when present
- [ ] Relevant Gmail thread history is surfaced and synthesized
- [ ] Materials and links exchanged in past threads are explicitly listed
- [ ] Open loops and commitments are identified from thread and meeting note context
- [ ] Talking points are contextually relevant
- [ ] Next-step checklist provides actionable recommended outcomes
- [ ] External participant profiles include LinkedIn data (when URL provided) and web research

### Dashboard
- [ ] Home page shows today's meetings as clickable cards with prep status
- [ ] Clicking a card opens the full prep pack view
- [ ] New contacts show LinkedIn URL prompt on their card
- [ ] Submitting LinkedIn URL triggers profile creation and prep pack generation
- [ ] Manual notes and doc links can be added from meeting detail view
- [ ] Blocklist successfully suppresses excluded meeting titles
- [ ] Contacts page shows stored profiles with full detail

### Contact Research
- [ ] First-time external contacts get Tavily web search + Lobstr.io LinkedIn profile
- [ ] Gemini Flash produces a clean, structured contact profile from raw data
- [ ] Contact profiles are stored permanently and reused for repeat meetings
- [ ] Repeat contacts do not trigger new research — stored profile is used

### Overall Experience
- [ ] Pushkar feels meaningfully more prepared than the current manual process
- [ ] The email is scannable in under 2 minutes
- [ ] The product works end-to-end without requiring Pushkar to visit the dashboard for routine meetings
- [ ] The dashboard provides genuine value for morning prep and reviewing multiple meetings

## Key Decisions and Assumptions
- **Email-first product** — the email is the product, dashboard is a smart calendar companion
- **Gemini Flash for all LLM tasks** — cost-effective, sufficient for structuring and organizing context
- **Lobstr.io for LinkedIn data** — Pushkar confirms correct URL, system scrapes once, stores permanently
- **Tavily for general web research** — company info, news, general context. Cannot scrape LinkedIn directly.
- **Fathom two-path strategy** — API first on free plan, Gmail-based extraction as fallback
- **One-time research, never refreshed** — contact profiles stored permanently after first research
- **Prep packs are cached snapshots** — generated once, served from DB, no regeneration on note additions
- **Auto-inferred meeting type** — Gemini Flash tags from context, no manual input required
- **Title-based blocklist** — simple exact match on meeting title
- **No cancellation handling** — prep fires based on calendar state at trigger time
- **Single sender for now** — aryan.jakhar@lemnisca.bio, migrated later
- **Two cron jobs** — daily morning scan for new contacts + every 5 minutes for prep pack triggering