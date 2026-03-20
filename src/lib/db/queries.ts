import { eq, and, gte, lte, ilike } from 'drizzle-orm';
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

export async function updateMeetingDetails(id: string, data: {
  title?: string;
  startTime?: Date;
  endTime?: Date;
  calendarDescription?: string;
  conferenceLink?: string;
}) {
  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.startTime !== undefined) updates.startTime = data.startTime;
  if (data.endTime !== undefined) updates.endTime = data.endTime;
  if (data.calendarDescription !== undefined) updates.calendarDescription = data.calendarDescription;
  if (data.conferenceLink !== undefined) updates.conferenceLink = data.conferenceLink;

  if (Object.keys(updates).length > 0) {
    await db.update(meetingsProcessed).set(updates).where(eq(meetingsProcessed.id, id));
  }
}

export async function deleteMeeting(id: string) {
  await db.delete(contactNotes).where(eq(contactNotes.meetingId, id));
  await db.delete(meetingParticipants).where(eq(meetingParticipants.meetingId, id));
  await db.delete(meetingsProcessed).where(eq(meetingsProcessed.id, id));
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

export async function updateContact(id: string, data: {
  name?: string;
  email?: string;
  organization?: string;
  title?: string;
  phone?: string;
  notes?: string;
  linkedinUrl?: string;
}) {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email.toLowerCase();
  if (data.organization !== undefined) updates.organization = data.organization;
  if (data.title !== undefined) updates.title = data.title;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.linkedinUrl !== undefined) updates.linkedinUrl = data.linkedinUrl;

  if (Object.keys(updates).length > 0) {
    await db.update(contacts).set(updates).where(eq(contacts.id, id));
  }
  return getContactById(id);
}

export async function deleteContact(id: string) {
  // Delete related records first
  await db.delete(contactNotes).where(eq(contactNotes.contactId, id));
  await db.delete(meetingParticipants).where(eq(meetingParticipants.contactId, id));
  await db.delete(contacts).where(eq(contacts.id, id));
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
