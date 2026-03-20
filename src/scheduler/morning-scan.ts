// src/scheduler/morning-scan.ts
import { getTodaysEvents, isExternalParticipant } from '@/lib/google/calendar';
import { getContactByEmail, createContact } from '@/lib/db/queries';
import { sendEmail } from '@/lib/google/gmail';
import { renderNewContactNotification } from '@/lib/email/render';

export async function runMorningScan(): Promise<void> {
  console.log('[Morning Scan] Starting daily scan...');

  const events = await getTodaysEvents();
  const newContacts: { name: string; company: string; meetingTime: string; contactId: string }[] = [];

  for (const event of events) {
    for (const attendee of event.attendees) {
      if (!isExternalParticipant(attendee.email)) continue;

      const existing = await getContactByEmail(attendee.email);
      if (existing) continue;

      const domain = attendee.email.split('@')[1];
      const company = domain.split('.')[0];
      const name = attendee.name ?? attendee.email.split('@')[0];

      const contact = await createContact({
        email: attendee.email,
        name,
        organization: company,
      });

      newContacts.push({
        name,
        company,
        meetingTime: event.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        contactId: contact.id,
      });
    }
  }

  if (newContacts.length > 0) {
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const html = await renderNewContactNotification(newContacts, dashboardUrl);
    const recipientEmail = process.env.RECIPIENT_EMAIL!;

    await sendEmail(
      recipientEmail,
      `New contact${newContacts.length > 1 ? 's' : ''} today: ${newContacts.map(c => c.name).join(', ')} — confirm LinkedIn`,
      html,
    );

    console.log(`[Morning Scan] Found ${newContacts.length} new contacts, notification sent.`);
  } else {
    console.log('[Morning Scan] No new contacts found.');
  }
}
