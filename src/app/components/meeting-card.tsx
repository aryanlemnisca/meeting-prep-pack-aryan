import Link from 'next/link';
import { LinkedInUrlInput } from './linkedin-url-input';
import { ManualTriggerButton } from './manual-trigger-button';

interface MeetingCardProps {
  meeting: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    templateType: string;
    meetingMode: string;
    meetingType: string | null;
    prepStatus: string;
  };
  participants: { contact: { id: string; name: string; email: string; profileSchema: any }; participant: { isExternal: boolean } }[];
}

const typeBadgeColors: Record<string, string> = {
  investor: 'bg-purple-900/50 text-purple-300',
  partner: 'bg-blue-900/50 text-blue-300',
  customer: 'bg-green-900/50 text-green-300',
  internal: 'bg-gray-800 text-gray-300',
  other: 'bg-yellow-900/50 text-yellow-300',
};

const statusBadgeColors: Record<string, string> = {
  ready: 'bg-green-900/50 text-green-300',
  pending: 'bg-yellow-900/50 text-yellow-300',
  generating: 'bg-blue-900/50 text-blue-300',
  failed: 'bg-red-900/50 text-red-300',
};

export function MeetingCard({ meeting, participants }: MeetingCardProps) {
  const startTime = new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(meeting.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const typeColor = typeBadgeColors[meeting.meetingType ?? 'other'] ?? typeBadgeColors.other;
  const statusColor = statusBadgeColors[meeting.prepStatus] ?? statusBadgeColors.pending;

  const newExternalContacts = participants.filter(
    p => p.participant.isExternal && !p.contact.profileSchema
  );

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111827] p-4 hover:border-gray-700 transition-colors">
      <Link href={`/meetings/${meeting.id}`} className="block">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-white">{meeting.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{startTime} — {endTime}</p>
          </div>
          <div className="flex gap-2">
            {meeting.meetingType && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
                {meeting.meetingType}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {meeting.prepStatus}
            </span>
          </div>
        </div>
        <div className="flex gap-1 mt-3">
          {participants.map(p => (
            <span
              key={p.contact.id}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-xs font-medium text-gray-400"
              title={p.contact.name}
            >
              {p.contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
      </Link>

      {/* Generate button for meetings without prep packs */}
      {(meeting.prepStatus === 'pending' || meeting.prepStatus === 'failed') && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <ManualTriggerButton meetingId={meeting.id} currentStatus={meeting.prepStatus} />
        </div>
      )}

      {/* LinkedIn URL prompts for new contacts */}
      {newExternalContacts.length > 0 && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          {newExternalContacts.map(p => (
            <LinkedInUrlInput
              key={p.contact.id}
              contactId={p.contact.id}
              contactName={p.contact.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
