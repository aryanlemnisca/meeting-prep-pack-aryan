// src/lib/pipeline/generate-prep.ts
import { generatePrepPack as geminiGeneratePrepPack, inferMeetingType } from '@/lib/integrations/gemini';
import { updateMeetingPrepContent, updateMeetingPrepStatus } from '@/lib/db/queries';
import type { AssembledContext, PrepPack, MeetingType } from '@/types';

export async function generatePrepPack(
  meetingId: string,
  context: AssembledContext,
): Promise<PrepPack> {
  // Update status to generating
  await updateMeetingPrepStatus(meetingId, 'generating');

  try {
    // Infer meeting type
    const meetingType = await inferMeetingType(
      context.participants.map(p => ({ email: p.email, name: p.name, isExternal: p.isExternal })),
      context.meeting.description,
    );

    // Generate the full prep pack
    const prepPack = await geminiGeneratePrepPack(context);

    // Store in DB
    await updateMeetingPrepContent(meetingId, prepPack, meetingType as MeetingType);

    return prepPack;
  } catch (error) {
    await updateMeetingPrepStatus(meetingId, 'failed');
    throw error;
  }
}
