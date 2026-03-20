// src/lib/email/templates/new-contact-notification.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components';

interface NewContactNotificationProps {
  contacts: { name: string; company: string; meetingTime: string; contactId: string }[];
  dashboardUrl: string;
}

export function NewContactNotification({ contacts, dashboardUrl }: NewContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
        <Container style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
          <Heading as="h1" style={{ fontSize: '22px', color: '#111827' }}>
            New contacts on today's calendar
          </Heading>
          <Text style={{ color: '#374151', fontSize: '14px' }}>
            Confirm their LinkedIn URLs so we can build profiles for your prep packs.
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {contacts.map((contact, i) => (
            <Container key={i} style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <Text style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                {contact.name} from {contact.company}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '0' }}>
                Meeting at {contact.meetingTime}
              </Text>
              <Button
                href={`${dashboardUrl}/contacts/${contact.contactId}`}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none' }}
              >
                Add LinkedIn URL
              </Button>
            </Container>
          ))}
        </Container>
      </Body>
    </Html>
  );
}
