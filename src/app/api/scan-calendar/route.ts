import { NextResponse } from 'next/server';
import { getTodaysEvents, buildCalendarEventId, isExternalParticipant } from '@/lib/google/calendar';
import {
  getMeetingByCalendarEventId,
  getTodaysMeetings,
  createMeeting,
  updateMeetingDetails,
  deleteMeeting,
  getContactByEmail,
  createContact,
  addMeetingParticipant,
  isBlocklisted,
} from '@/lib/db/queries';
import type { TemplateType, MeetingMode } from '@/types';

export async function POST() {
  try {
    const events = await getTodaysEvents();
    let added = 0;
    let updated = 0;
    let removed = 0;
    let skipped = 0;

    // Build set of calendar event IDs from Google Calendar
    const calendarEventIds = new Set(
      events.map(e => buildCalendarEventId(e.id, e.startTime))
    );

    // Remove meetings from DB that no longer exist in calendar
    const dbMeetings = await getTodaysMeetings();
    for (const dbMeeting of dbMeetings) {
      if (!calendarEventIds.has(dbMeeting.calendarEventId)) {
        await deleteMeeting(dbMeeting.id);
        removed++;
      }
    }

    for (const event of events) {
      const calendarEventId = buildCalendarEventId(event.id, event.startTime);

      // If already in DB, sync any changes (title, time, description)
      const existing = await getMeetingByCalendarEventId(calendarEventId);
      if (existing) {
        const changed =
          existing.title !== event.title ||
          existing.startTime.getTime() !== event.startTime.getTime() ||
          existing.endTime.getTime() !== event.endTime.getTime() ||
          existing.calendarDescription !== (event.description ?? null) ||
          existing.conferenceLink !== (event.conferenceLink ?? null);

        if (changed) {
          await updateMeetingDetails(existing.id, {
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            calendarDescription: event.description,
            conferenceLink: event.conferenceLink,
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      // Skip if blocklisted
      if (await isBlocklisted(event.title)) {
        skipped++;
        continue;
      }

      // Determine template type and meeting mode
      const hasExternal = event.attendees.some(a => isExternalParticipant(a.email));
      const templateType: TemplateType = hasExternal ? 'external' : 'internal';

      let meetingMode: MeetingMode = 'internal';
      if (hasExternal) {
        let hasNew = false;
        for (const attendee of event.attendees.filter(a => isExternalParticipant(a.email))) {
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

      // Link participants (only external ones as contacts)
      for (const attendee of event.attendees) {
        // Skip internal team members — don't create contacts for them
        if (!isExternalParticipant(attendee.email)) continue;

        let contact = await getContactByEmail(attendee.email);
        if (!contact) {
          const domain = attendee.email.split('@')[1];
          contact = await createContact({
            email: attendee.email,
            name: attendee.name ?? attendee.email.split('@')[0],
            organization: domain?.split('.')[0],
          });
        }
        await addMeetingParticipant({
          meetingId: meeting.id,
          contactId: contact.id,
          isExternal: true,
        });
      }

      added++;
    }

    return NextResponse.json({
      success: true,
      totalEvents: events.length,
      added,
      updated,
      removed,
      skipped,
    });
  } catch (error: any) {
    console.error('[Scan Calendar] Error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to scan calendar' },
      { status: 500 },
    );
  }
}
