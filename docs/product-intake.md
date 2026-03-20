# Product Intake Doc — Meeting Prep Pack

## Product Title
Meeting Prep Pack

## Target User
Pushkar (Founder, Lemnisca)

## Current Workflow
Before important meetings, Pushkar manually gathers context by scanning Gmail threads with participants, reviewing calendar invite details and notes, recalling prior conversations and commitments from memory, checking if any materials or decks were shared previously, and mentally assembling talking points and next steps.

This process is repeated before every significant meeting. Quality of preparation depends directly on how much time is available, which varies day to day. There is no structured system — it runs entirely on manual effort and memory.

## Pain Points
- **Repetitive prep cycle** — the same gather-and-synthesize process happens before every meeting with no compounding benefit
- **Context gets missed** — email threads, prior commitments, shared materials, and open loops fall through the cracks especially under time pressure
- **Memory dependency is risky** — high-stakes investor and partner conversations rely on recall of details that may be weeks or months old
- **Inconsistent prep quality** — a meeting with 30 minutes of prep time gets fundamentally different treatment than one squeezed between back-to-back calls
- **No visibility into open loops** — promises made, follow-ups owed, and unresolved items are not tracked across interactions
- **No first-time vs repeat distinction** — Pushkar has to manually figure out how much history exists with each participant
- **Materials and links get buried** — decks, docs, and links shared in past threads are hard to resurface quickly

## Business / Founder Relevance
Pushkar's meetings directly drive Lemnisca's fundraising pipeline, partnership development, customer conversations, and internal execution. A missed open loop with an investor or a forgotten commitment to a partner has real cost. The frequency of external meetings is high enough that even a modest improvement in per-meeting prep quality compounds into meaningfully better outcomes across weeks and months. This is a high-leverage, high-frequency founder workflow.

## Constraints
- **Single user** — only Pushkar, no multi-user support or auth needed
- **Email-first delivery** — the primary product surface is the prep email, not a dashboard
- **Dashboard as smart calendar** — secondary surface showing today's meetings as cards with full prep pack on click
- **Sender email** — aryan.jakhar@lemnisca.bio for now, will migrate to Pushkar's email later
- **Calendar and Gmail access required** — Google API integration is a hard dependency
- **LinkedIn data requires manual URL confirmation** — Pushkar provides the correct LinkedIn URL for new contacts to avoid wrong-person scraping
- **No enterprise-grade infrastructure** — lightweight deployment on Railway
- **Gemini Flash for all LLM tasks** — cost-effective, sufficient for structuring/organizing tasks

## Initial Assumptions
- Pushkar has enough email history with most repeat contacts that Gmail thread search will yield useful context
- Calendar event attendee emails are reliable enough to match against Gmail threads
- Company info can be reasonably inferred from participant email domains for external contacts
- A 20-minute pre-meeting delivery window is sufficient — not too early to forget, not too late to be useless
- Internal meetings (all participants @lemnisca.bio) need operational context (open loops, commitments, recent threads, materials exchanged) but not personal/company research
- External meetings (any non-lemnisca.bio participant) need full context including participant background, company info, and relationship history
- First-time external contacts get deep research (Tavily + Lobstr.io LinkedIn); repeat contacts reuse stored profiles with no re-research
- Meeting type (investor/partner/customer/internal) can be auto-inferred by Gemini Flash from participant domains and context
- Meeting objective can be pulled from calendar event description when present
- HTML email formatting is acceptable and will render correctly in Pushkar's email client
- A simple title-based blocklist is sufficient for excluding recurring low-value meetings
- Prep packs are one-time snapshots — generated once per meeting, served from cache on subsequent views
- Manual notes added after prep pack generation show alongside the pack on the dashboard but do not trigger regeneration
- Fathom free plan may or may not include API access — Gmail-based fallback is designed as a backup