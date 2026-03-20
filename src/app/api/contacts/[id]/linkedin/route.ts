// src/app/api/contacts/[id]/linkedin/route.ts
import { NextResponse } from 'next/server';
import { getContactById, updateContactLinkedIn, updateContactProfile } from '@/lib/db/queries';
import { scrapeLinkedInProfile } from '@/lib/integrations/lobstrio';
import { searchContactContext } from '@/lib/integrations/tavily';
import { normalizeContactProfile } from '@/lib/integrations/gemini';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { linkedinUrl } = await req.json();

  if (!linkedinUrl) return NextResponse.json({ error: 'LinkedIn URL required' }, { status: 400 });

  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Save URL
  await updateContactLinkedIn(id, linkedinUrl);

  // Scrape LinkedIn
  const lobstrData = await scrapeLinkedInProfile(linkedinUrl);

  // Run Tavily search if no existing research
  let tavilyData = null;
  if (!contact.researchData) {
    tavilyData = await searchContactContext(contact.name, contact.organization ?? undefined);
  }

  // Normalize with Gemini
  const profile = await normalizeContactProfile(lobstrData, tavilyData);

  // Store
  await updateContactProfile(id, {
    linkedinProfile: lobstrData,
    researchData: tavilyData ?? contact.researchData,
    profileSchema: profile,
  });

  return NextResponse.json({ success: true, profile });
}
