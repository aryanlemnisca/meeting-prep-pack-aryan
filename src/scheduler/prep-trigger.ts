import { getUpcomingEvents, getTodaysEvents, buildCalendarEventId, isExternalParticipant } from '@/lib/google/calendar';
import { getMeetingByCalendarEventId, createMeeting, createContact, isBlocklisted, addMeetingParticipant, getContactByEmail, updateContactLastInteraction } from '@/lib/db/queries';
import { sendEmail } from '@/lib/google/gmail';
import { renderNewContactNotification } from '@/lib/email/render';
import { assembleContext } from '@/lib/pipeline/assemble-context';
import { generatePrepPack } from '@/lib/pipeline/generate-prep';
import { deliverPrepEmail } from '@/lib/pipeline/deliver-email';
import type { TemplateType, MeetingMode } from '@/types';

export async function runPrepTrigger(): Promise<void> {
  console.log('[Prep Trigger] Checking for upcoming meetings...');

  // Check for new contacts on ALL today's events (not just upcoming 25 min)
  await checkForNewContacts();

  // Process meetings starting in the next 25 minutes
  const events = await getUpcomingEvents(25);

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

      // Link participants (only external)
      for (const attendee of event.attendees) {
        if (!isExternalParticipant(attendee.email)) continue;

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
          isExternal: true,
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

// Check ALL of today's events for new external contacts and send notification
async function checkForNewContacts(): Promise<void> {
  try {
    const events = await getTodaysEvents();
    const newContacts: { name: string; company: string; meetingTime: string; contactId: string }[] = [];

    for (const event of events) {
      for (const attendee of event.attendees) {
        if (!isExternalParticipant(attendee.email)) continue;

        const existing = await getContactByEmail(attendee.email);
        if (existing) continue;

        // New external contact found — create placeholder
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

        console.log(`[Prep Trigger] New contact detected: ${name} (${attendee.email})`);
      }
    }

    // Send notification email if new contacts found
    if (newContacts.length > 0) {
      const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const html = await renderNewContactNotification(newContacts, dashboardUrl);
      const recipientEmail = process.env.RECIPIENT_EMAIL!;

      await sendEmail(
        recipientEmail,
        `New contact${newContacts.length > 1 ? 's' : ''}: ${newContacts.map(c => c.name).join(', ')} — add LinkedIn URL`,
        html,
      );

      console.log(`[Prep Trigger] Sent new contact notification for ${newContacts.length} contact(s)`);
    }
  } catch (error) {
    console.error('[Prep Trigger] New contact check failed:', error);
    // Don't fail the whole trigger if this check fails
  }
}
