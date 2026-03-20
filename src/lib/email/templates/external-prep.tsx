// src/lib/email/templates/external-prep.tsx
import { Html, Head, Body, Container, Section, Heading, Text, Hr, Link } from '@react-email/components';
import type { PrepPack } from '@/types';

interface ExternalPrepEmailProps {
  prepPack: PrepPack;
}

export function ExternalPrepEmail({ prepPack }: ExternalPrepEmailProps) {
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
            {prepPack.meetingInfo.time} · {prepPack.meetingInfo.inferredType.toUpperCase()}
          </Text>
          {prepPack.meetingInfo.objective && (
            <Text style={{ color: '#374151', fontSize: '14px', fontStyle: 'italic' }}>
              Objective: {prepPack.meetingInfo.objective}
            </Text>
          )}
          <Text style={{ color: '#374151', fontSize: '14px' }}>
            Participants: {prepPack.meetingInfo.participants.map(p => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ')}
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Section 2: Participant Profiles */}
          {prepPack.participantProfiles && prepPack.participantProfiles.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Participant Profiles</Heading>
              {prepPack.participantProfiles.map((profile, i) => (
                <Section key={i} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <Text style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                    {profile.name} — {profile.currentRole} at {profile.company}
                  </Text>
                  <Text style={{ color: '#374151', fontSize: '14px' }}>{profile.background}</Text>
                  {profile.highlights.length > 0 && (
                    <Text style={{ color: '#6b7280', fontSize: '13px' }}>
                      Highlights: {profile.highlights.join(' · ')}
                    </Text>
                  )}
                </Section>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 3: Company Context */}
          {prepPack.companyContext && prepPack.companyContext.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Company Context</Heading>
              {prepPack.companyContext.map((company, i) => (
                <Section key={i} style={{ marginBottom: '12px' }}>
                  <Text style={{ fontWeight: 'bold', color: '#111827' }}>{company.name}</Text>
                  <Text style={{ color: '#374151', fontSize: '14px' }}>{company.description}</Text>
                  {company.recentNews.length > 0 && (
                    <Text style={{ color: '#6b7280', fontSize: '13px' }}>
                      Recent: {company.recentNews.join(' · ')}
                    </Text>
                  )}
                </Section>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 4: Prior Interaction Summary */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Prior Interactions</Heading>
          <Text style={{ color: '#374151', fontSize: '14px' }}>{prepPack.priorInteractionSummary}</Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Section 5: Last Touchpoint */}
          {prepPack.lastTouchpoint && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Last Touchpoint</Heading>
              <Text style={{ color: '#374151', fontSize: '14px' }}>
                <strong>{prepPack.lastTouchpoint.date}</strong> — {prepPack.lastTouchpoint.summary}
              </Text>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 6: Materials Exchanged */}
          {prepPack.materialsExchanged.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Materials Exchanged</Heading>
              {prepPack.materialsExchanged.map((m, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • {m.description} ({m.type}){m.date ? ` — ${m.date}` : ''}{m.link ? <> — <Link href={m.link}>{m.link}</Link></> : ''}
                </Text>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 7: Open Loops */}
          {prepPack.openLoops.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Open Loops</Heading>
              {prepPack.openLoops.map((loop, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • <strong>{loop.item}</strong> — {loop.context}
                </Text>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 8: Commitments */}
          {prepPack.commitments.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Commitments</Heading>
              {prepPack.commitments.map((c, i) => (
                <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                  • [{c.by === 'us' ? 'WE' : 'THEY'} — {c.status.toUpperCase()}] {c.commitment}
                </Text>
              ))}
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            </>
          )}

          {/* Section 9: Talking Points */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Talking Points</Heading>
          {prepPack.talkingPoints.map((point, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              • {point}
            </Text>
          ))}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Section 10: Next Steps */}
          <Heading as="h2" style={{ fontSize: '18px', color: '#111827' }}>Next-Step Checklist</Heading>
          {prepPack.nextStepChecklist.map((step, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
              ☐ {step}
            </Text>
          ))}

          {/* Data Gaps Warning */}
          {prepPack.dataGaps && prepPack.dataGaps.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
              <Text style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>
                Note: Some data sources were unavailable — {prepPack.dataGaps.join(', ')}
              </Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}
