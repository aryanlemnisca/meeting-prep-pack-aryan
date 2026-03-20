// src/lib/pipeline/deliver-email.ts
import { sendEmail } from '@/lib/google/gmail';
import { renderPrepEmail } from '@/lib/email/render';
import { markMeetingEmailSent } from '@/lib/db/queries';
import type { PrepPack, TemplateType } from '@/types';

export async function deliverPrepEmail(
  meetingId: string,
  prepPack: PrepPack,
  templateType: TemplateType,
  meetingTitle: string,
  meetingTime: string,
): Promise<void> {
  const recipientEmail = process.env.RECIPIENT_EMAIL!;
  const subject = `Prep Pack: ${meetingTitle} — ${meetingTime}`;

  const html = await renderPrepEmail(prepPack, templateType);

  await sendEmail(recipientEmail, subject, html);
  await markMeetingEmailSent(meetingId);

  console.log(`[Email] Prep pack sent for "${meetingTitle}" to ${recipientEmail}`);
}
