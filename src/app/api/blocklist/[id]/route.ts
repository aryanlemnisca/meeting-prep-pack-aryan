// src/app/api/blocklist/[id]/route.ts
import { NextResponse } from 'next/server';
import { removeFromBlocklist } from '@/lib/db/queries';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeFromBlocklist(id);
  return NextResponse.json({ success: true });
}
