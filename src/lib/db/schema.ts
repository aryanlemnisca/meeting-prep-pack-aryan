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
  title: text('title'),
  phone: text('phone'),
  notes: text('notes'),
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
