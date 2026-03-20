import { getCalendarClient } from './auth';
import type { CalendarEvent } from '@/types';

export async function getUpcomingEvents(minutesAhead: number): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();
  const now = new Date();
  const timeMax = new Date(now.getTime() + minutesAhead * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items ?? []).map(parseCalendarEvent).filter(Boolean) as CalendarEvent[];
}

export async function getTodaysEvents(): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items ?? []).map(parseCalendarEvent).filter(Boolean) as CalendarEvent[];
}

function parseCalendarEvent(event: any): CalendarEvent | null {
  if (!event.id || !event.start?.dateTime) return null;

  const attendees = (event.attendees ?? []).map((a: any) => ({
    email: a.email,
    name: a.displayName,
    responseStatus: a.responseStatus,
  }));

  let conferenceLink: string | undefined;
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
    conferenceLink = videoEntry?.uri;
  }
  if (!conferenceLink && event.hangoutLink) {
    conferenceLink = event.hangoutLink;
  }

  return {
    id: event.id,
    title: event.summary ?? 'Untitled',
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end?.dateTime ?? event.start.dateTime),
    description: event.description,
    conferenceLink,
    attendees,
  };
}

export function buildCalendarEventId(eventId: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `${eventId}_${dateStr}`;
}

export function isExternalParticipant(email: string): boolean {
  return !email.endsWith('@lemnisca.bio');
}
