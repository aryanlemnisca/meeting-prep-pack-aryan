import { getTodaysMeetings, getParticipantsForMeeting } from '@/lib/db/queries';
import { MeetingCard } from './components/meeting-card';
import { ScanCalendarButton } from './components/scan-calendar-button';
import { formatFullDate } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const meetings = await getTodaysMeetings();

  const meetingsWithParticipants = await Promise.all(
    meetings.map(async (meeting) => {
      const participants = await getParticipantsForMeeting(meeting.id);
      return { meeting, participants };
    })
  );

  const today = formatFullDate(new Date());

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Today&apos;s Meetings</h1>
          <p className="text-sm text-gray-400 mt-1">{today}</p>
        </div>
        <ScanCalendarButton />
      </div>

      {meetingsWithParticipants.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-[#111827] p-8 text-center">
          <p className="text-gray-400">No meetings scheduled for today.</p>
          <p className="text-sm text-gray-500 mt-1">Meetings will appear here once the scheduler processes them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetingsWithParticipants.map(({ meeting, participants }) => (
            <MeetingCard
              key={meeting.id}
              meeting={{
                ...meeting,
                startTime: meeting.startTime.toISOString(),
                endTime: meeting.endTime.toISOString(),
              }}
              participants={participants}
            />
          ))}
        </div>
      )}
    </div>
  );
}
