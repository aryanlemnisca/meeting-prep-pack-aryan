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
