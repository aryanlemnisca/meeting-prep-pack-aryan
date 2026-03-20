import { getMeetingById, getParticipantsForMeeting, getNotesForMeeting } from '@/lib/db/queries';
import { PrepPackView } from '@/app/components/prep-pack-view';
import { AddNoteForm } from '@/app/components/add-note-form';
import { ManualTriggerButton } from '@/app/components/manual-trigger-button';
import { notFound } from 'next/navigation';
import { formatTime, formatDate } from '@/lib/timezone';
import type { PrepPack } from '@/types';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  if (!meeting) notFound();

  const participants = await getParticipantsForMeeting(id);
  const notes = await getNotesForMeeting(id);

  const startTime = formatTime(meeting.startTime);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{startTime} · {meeting.meetingType ?? meeting.templateType}</p>
        </div>
        {meeting.prepStatus !== 'ready' && (
          <ManualTriggerButton meetingId={id} currentStatus={meeting.prepStatus} />
        )}
      </div>

      {meeting.prepContent ? (
        <PrepPackView prepPack={meeting.prepContent as PrepPack} />
      ) : meeting.prepStatus === 'generating' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-800 bg-[#111827] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
                <div className="absolute inset-0 rounded-full border-2 border-[#00BFFF] border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-white font-medium">Generating prep pack...</p>
            </div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 rounded animate-shimmer" style={{ width: `${30 + Math.random() * 40}%` }} />
                  <div className="h-2 rounded animate-shimmer" style={{ width: `${60 + Math.random() * 30}%` }} />
                  <div className="h-2 rounded animate-shimmer" style={{ width: `${40 + Math.random() * 50}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : meeting.prepStatus === 'failed' ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6 text-center">
          <p className="text-red-400 font-medium">Prep pack generation failed</p>
          <p className="text-sm text-gray-500 mt-1">Try generating again</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 bg-[#111827] p-8 text-center">
          <p className="text-gray-400">Prep pack not yet generated.</p>
          <p className="text-xs text-gray-600 mt-1">Click &quot;Generate Prep Pack&quot; to start</p>
        </div>
      )}

      {/* Manual Notes */}
      <div className="mt-8 border-t border-gray-800 pt-6">
        <h2 className="text-lg font-semibold text-white mb-3">Notes</h2>
        {notes.length > 0 ? (
          <div className="space-y-3 mb-4">
            {notes.map(note => (
              <div key={note.id} className="rounded-md bg-[#111827] p-3">
                <p className="text-sm text-gray-300">{note.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {note.noteType.replace('_', ' ')} · {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <AddNoteForm meetingId={id} />
      </div>
    </div>
  );
}
