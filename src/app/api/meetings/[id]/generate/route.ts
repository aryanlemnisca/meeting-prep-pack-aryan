// src/app/api/meetings/[id]/generate/route.ts
// NOTE: Manual trigger skips blocklist — if Pushkar explicitly wants a prep pack, respect that
import { NextResponse } from 'next/server';
import { getMeetingById, getParticipantsForMeeting } from '@/lib/db/queries';
import { assembleContext } from '@/lib/pipeline/assemble-context';
import { generatePrepPack } from '@/lib/pipeline/generate-prep';
import { deliverPrepEmail } from '@/lib/pipeline/deliver-email';
import type { CalendarEvent } from '@/types';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Build a CalendarEvent-like object from stored meeting data
  const participants = await getParticipantsForMeeting(id);
  const event: CalendarEvent = {
    id: meeting.calendarEventId,
    title: meeting.title,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    description: meeting.calendarDescription ?? undefined,
    conferenceLink: meeting.conferenceLink ?? undefined,
    attendees: participants.map(p => ({
      email: p.contact.email,
      name: p.contact.name,
    })),
  };

  const context = await assembleContext(event);
  const prepPack = await generatePrepPack(id, context);

  const meetingTime = meeting.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  await deliverPrepEmail(id, prepPack, meeting.templateType as any, meeting.title, meetingTime);

  return NextResponse.json({ success: true, prepPack });
}
