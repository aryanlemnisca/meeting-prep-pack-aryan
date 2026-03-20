import { NextResponse } from 'next/server';
import { getContactById, getNotesForContact, updateContact, deleteContact } from '@/lib/db/queries';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const notes = await getNotesForContact(id);
  return NextResponse.json({ contact, notes });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await updateContact(id, {
    name: body.name,
    email: body.email,
    organization: body.organization,
    title: body.title,
    phone: body.phone,
    notes: body.notes,
    linkedinUrl: body.linkedinUrl,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteContact(id);
  return NextResponse.json({ success: true });
}
