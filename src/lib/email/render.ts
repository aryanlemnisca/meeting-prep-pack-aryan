// src/lib/email/render.ts
import { render } from '@react-email/components';
import { ExternalPrepEmail } from './templates/external-prep';
import { InternalPrepEmail } from './templates/internal-prep';
import { NewContactNotification } from './templates/new-contact-notification';
import type { PrepPack, TemplateType } from '@/types';

export async function renderPrepEmail(prepPack: PrepPack, templateType: TemplateType): Promise<string> {
  if (templateType === 'internal') {
    return await render(InternalPrepEmail({ prepPack }));
  }
  return await render(ExternalPrepEmail({ prepPack }));
}

export async function renderNewContactNotification(
  contacts: { name: string; company: string; meetingTime: string; contactId: string }[],
  dashboardUrl: string,
): Promise<string> {
  return await render(NewContactNotification({ contacts, dashboardUrl }));
}
