// src/scheduler/prep-trigger.ts
import { getUpcomingEvents, buildCalendarEventId, isExternalParticipant } from '@/lib/google/calendar';
import { getMeetingByCalendarEventId, createMeeting, createContact, isBlocklisted, addMeetingParticipant, getContactByEmail, updateContactLastInteraction } from '@/lib/db/queries';
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
