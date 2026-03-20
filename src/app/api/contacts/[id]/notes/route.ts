import { NextResponse } from 'next/server';
import { getContactById, createNote, getNotesForContact } from '@/lib/db/queries';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await getNotesForContact(id);
  return NextResponse.json(notes);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content, noteType = 'general' } = await req.json();

  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const note = await createNote({
    contactId: id,
    noteType,
    content,
  });

  return NextResponse.json(note);
}
