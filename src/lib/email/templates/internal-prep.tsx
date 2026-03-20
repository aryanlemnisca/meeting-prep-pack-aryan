// src/lib/email/templates/internal-prep.tsx
import { Html, Head, Body, Container, Section, Heading, Text, Hr, Link } from '@react-email/components';
import type { PrepPack } from '@/types';

interface InternalPrepEmailProps {
  prepPack: PrepPack;
}

export function InternalPrepEmail({ prepPack }: InternalPrepEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
        <Container style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
          {/* Section 1: Meeting Info */}
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827', marginBottom: '4px' }}>
            {prepPack.meetingInfo.title}
          </Heading>
          <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '0' }}>
            {prepPack.meetingInfo.time} · INTERNAL
          </Text>
          {prepPack.meetingInfo.objective && (
            <Text style={{ color: '#374151', fontSize: '14px', fontStyle: 'italic' }}>
              Objective: {prepPack.meetingInfo.objective}
            </Text>
          )}
          <Text style={{ color: '#374151', fontSize: '14px' }}>
            Participants: {prepPack.meetingInfo.participants.map(p => p.name).join(', ')}
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Sections 4-10: same as external but without profiles/company */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Prior Interactions</Heading>
          <Text style={{ color: '#374151', fontSize: '14px' }}>{prepPack.priorInteractionSummary}</Text>

          {prepPack.lastTouchpoint && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Last Touchpoint</Heading>
              <Text style={{ color: '#374151', fontSize: '14px' }}>
                <strong>{prepPack.lastTouchpoint.date}</strong> — {prepPack.lastTouchpoint.summary}
              </Text>
            </>
          )}

          {prepPack.materialsExchanged.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Materials Exchanged</Heading>
              {prepPack.materialsExchanged.map((m, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • {m.description} ({m.type}){m.link ? <> — <Link href={m.link}>{m.link}</Link></> : ''}
                </Text>
              ))}
            </>
          )}

          {prepPack.openLoops.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Open Loops</Heading>
              {prepPack.openLoops.map((loop, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • <strong>{loop.item}</strong> — {loop.context}
                </Text>
              ))}
            </>
          )}

          {prepPack.commitments.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Commitments</Heading>
              {prepPack.commitments.map((c, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • [{c.by === 'us' ? 'WE' : 'THEY'} — {c.status.toUpperCase()}] {c.commitment}
                </Text>
              ))}
            </>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Talking Points</Heading>
          {prepPack.talkingPoints.map((point, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              • {point}
            </Text>
          ))}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Next-Step Checklist</Heading>
          {prepPack.nextStepChecklist.map((step, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              ☐ {step}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
}
