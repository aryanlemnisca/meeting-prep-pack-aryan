// src/app/api/blocklist/route.ts
import { NextResponse } from 'next/server';
import { getBlocklist, addToBlocklist } from '@/lib/db/queries';

export async function GET() {
  const entries = await getBlocklist();
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const { titlePattern } = await req.json();
  if (!titlePattern) return NextResponse.json({ error: 'Title pattern required' }, { status: 400 });

  const entry = await addToBlocklist(titlePattern);
  return NextResponse.json(entry);
}
