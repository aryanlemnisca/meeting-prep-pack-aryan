// src/app/api/contacts/route.ts
import { NextResponse } from 'next/server';
import { getAllContacts } from '@/lib/db/queries';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? undefined;
  const contacts = await getAllContacts(search);
  return NextResponse.json(contacts);
}
