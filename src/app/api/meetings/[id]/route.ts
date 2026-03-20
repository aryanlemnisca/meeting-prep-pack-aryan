// src/app/api/meetings/[id]/route.ts
import { NextResponse } from 'next/server';
import { getMeetingById, getParticipantsForMeeting, getNotesForMeeting } from '@/lib/db/queries';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const participants = await getParticipantsForMeeting(id);
  const notes = await getNotesForMeeting(id);

  return NextResponse.json({ meeting, participants, notes });
}
