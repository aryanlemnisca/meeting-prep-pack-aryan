// src/app/api/meetings/[id]/notes/route.ts
import { NextResponse } from 'next/server';
import { createNote, getParticipantsForMeeting } from '@/lib/db/queries';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content, noteType = 'post_meeting' } = await req.json();

  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

  // Add note to all participants of this meeting
  const participants = await getParticipantsForMeeting(id);
  const notes = [];
  for (const p of participants) {
    const note = await createNote({
      contactId: p.contact.id,
      noteType,
      content,
      meetingId: id,
    });
    notes.push(note);
  }

  return NextResponse.json({ success: true, notes });
}
