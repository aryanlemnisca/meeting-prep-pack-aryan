'use client';
import { useState } from 'react';
import type { PrepPack } from '@/types';

export function PrepPackView({ prepPack }: { prepPack: PrepPack }) {
  return (
    <div className="space-y-6">
      {/* Meeting Info */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Meeting Info</h2>
        <div className="rounded-md bg-[#111827] p-4">
          <p className="text-sm text-gray-300"><strong>Time:</strong> {prepPack.meetingInfo.time}</p>
          <p className="text-sm text-gray-300"><strong>Type:</strong> {prepPack.meetingInfo.inferredType}</p>
          {prepPack.meetingInfo.objective && (
            <p className="text-sm text-gray-300"><strong>Objective:</strong> {prepPack.meetingInfo.objective}</p>
          )}
          <p className="text-sm text-gray-300">
            <strong>Participants:</strong> {prepPack.meetingInfo.participants.map(p => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ')}
          </p>
        </div>
      </section>

      {/* Participant Profiles */}
      {prepPack.participantProfiles && prepPack.participantProfiles.length > 0 && (
        <CollapsibleSection title="Participant Profiles" defaultOpen>
          {prepPack.participantProfiles.map((profile, i) => (
            <div key={i} className="rounded-md bg-[#111827] p-4 mb-3">
              <p className="font-medium text-white">{profile.name}</p>
              <p className="text-sm text-gray-400">{profile.currentRole} at {profile.company}</p>
              <p className="text-sm text-gray-300 mt-2">{profile.background}</p>
              {profile.highlights.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Highlights</p>
                  <ul className="list-disc list-inside text-sm text-gray-300">
                    {profile.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Company Context */}
      {prepPack.companyContext && prepPack.companyContext.length > 0 && (
        <CollapsibleSection title="Company Context">
          {prepPack.companyContext.map((company, i) => (
            <div key={i} className="mb-3">
              <p className="font-medium text-white">{company.name}</p>
              <p className="text-sm text-gray-300">{company.description}</p>
              {company.recentNews.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-400 mt-1">
                  {company.recentNews.map((n, j) => <li key={j}>{n}</li>)}
                </ul>
              )}
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Prior Interactions */}
      <CollapsibleSection title="Prior Interactions" defaultOpen>
        <p className="text-sm text-gray-300">{prepPack.priorInteractionSummary}</p>
      </CollapsibleSection>

      {/* Last Touchpoint */}
      {prepPack.lastTouchpoint && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Last Touchpoint</h2>
          <p className="text-sm text-gray-300">
            <strong>{prepPack.lastTouchpoint.date}</strong> — {prepPack.lastTouchpoint.summary}
          </p>
        </section>
      )}

      {/* Materials */}
      {prepPack.materialsExchanged.length > 0 && (
        <CollapsibleSection title="Materials Exchanged">
          <ul className="space-y-1">
            {prepPack.materialsExchanged.map((m, i) => (
              <li key={i} className="text-sm text-gray-300">
                {m.description} <span className="text-gray-500">({m.type})</span>
                {m.link && <a href={m.link} className="text-[#00BFFF] ml-1 hover:underline" target="_blank" rel="noopener noreferrer">{m.link}</a>}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Open Loops */}
      {prepPack.openLoops.length > 0 && (
        <CollapsibleSection title="Open Loops" defaultOpen>
          <ul className="space-y-2">
            {prepPack.openLoops.map((loop, i) => (
              <li key={i} className="text-sm text-gray-300">
                <strong>{loop.item}</strong> — {loop.context}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Commitments */}
      {prepPack.commitments.length > 0 && (
        <CollapsibleSection title="Commitments" defaultOpen>
          <ul className="space-y-1">
            {prepPack.commitments.map((c, i) => (
              <li key={i} className="text-sm text-gray-300">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium mr-1 ${c.status === 'delivered' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                  {c.by === 'us' ? 'WE' : 'THEY'} · {c.status}
                </span>
                {c.commitment}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Talking Points */}
      <CollapsibleSection title="Talking Points" defaultOpen>
        <ul className="list-disc list-inside space-y-1">
          {prepPack.talkingPoints.map((point, i) => (
            <li key={i} className="text-sm text-gray-300">{point}</li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Next Steps */}
      <CollapsibleSection title="Next-Step Checklist" defaultOpen>
        <ul className="space-y-1">
          {prepPack.nextStepChecklist.map((step, i) => (
            <li key={i} className="text-sm text-gray-300">{step}</li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Data Gaps */}
      {prepPack.dataGaps && prepPack.dataGaps.length > 0 && (
        <p className="text-xs text-gray-500 italic">
          Data gaps: {prepPack.dataGaps.join(', ')}
        </p>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-lg font-semibold text-white mb-2"
      >
        {title}
        <span className="text-sm text-gray-500">{open ? '\u2212' : '+'}</span>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}
