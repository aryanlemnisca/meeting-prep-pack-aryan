// src/app/api/meetings/route.ts
import { NextResponse } from 'next/server';
import { getTodaysMeetings } from '@/lib/db/queries';

export async function GET() {
  const meetings = await getTodaysMeetings();
  return NextResponse.json(meetings);
}
