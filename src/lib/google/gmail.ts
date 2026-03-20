import { getGmailClient } from './auth';

export interface GmailThread {
  id: string;
  snippet: string;
  messages: GmailMessage[];
}

export interface GmailMessage {
  id: string;
  date: Date;
  from: string;
  to: string;
  subject: string;
  body: string;
}

export async function searchThreadsByEmail(participantEmail: string, maxResults = 10): Promise<GmailThread[]> {
  const gmail = getGmailClient();

  const response = await gmail.users.threads.list({
    userId: 'me',
    q: participantEmail,
    maxResults,
  });

  const threads: GmailThread[] = [];
  for (const threadRef of response.data.threads ?? []) {
    if (!threadRef.id) continue;
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadRef.id,
      format: 'full',
    });

    const messages = (thread.data.messages ?? []).map(parseGmailMessage).filter(Boolean) as GmailMessage[];
    threads.push({
      id: threadRef.id,
      snippet: thread.data.messages?.[0]?.snippet ?? '',
      messages,
    });
  }

  return threads;
}

export async function searchFathomEmails(participantQuery: string, maxResults = 5): Promise<GmailThread[]> {
  const gmail = getGmailClient();

  const response = await gmail.users.threads.list({
    userId: 'me',
    q: `from:notifications@fathom.video ${participantQuery}`,
    maxResults,
  });

  const threads: GmailThread[] = [];
  for (const threadRef of response.data.threads ?? []) {
    if (!threadRef.id) continue;
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadRef.id,
      format: 'full',
    });

    const messages = (thread.data.messages ?? []).map(parseGmailMessage).filter(Boolean) as GmailMessage[];
    threads.push({
      id: threadRef.id,
      snippet: thread.data.messages?.[0]?.snippet ?? '',
      messages,
    });
  }

  return threads;
}

function parseGmailMessage(message: any): GmailMessage | null {
  if (!message.id) return null;

  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

  let body = '';
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    const textPart = message.payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  }

  return {
    id: message.id,
    date: new Date(parseInt(message.internalDate ?? '0')),
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    body,
  };
}

export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const gmail = getGmailClient();
  const from = process.env.SENDER_EMAIL!;

  const rawMessage = createRawEmail(from, to, subject, htmlBody);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
    },
  });
}

function createRawEmail(from: string, to: string, subject: string, htmlBody: string): string {
  // MIME encode subject for UTF-8 support (handles em dashes, accents, etc.)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody).toString('base64'),
  ];

  const message = messageParts.join('\r\n');
  return Buffer.from(message).toString('base64url');
}
