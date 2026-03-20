export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="rounded-lg border border-gray-800 bg-[#111827] p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Morning Scan Time</label>
            <p className="text-sm text-gray-400 mt-1">
              Currently set to {process.env.MORNING_SCAN_HOUR ?? '7'}:00 AM (configured via MORNING_SCAN_HOUR env var)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Sender Email</label>
            <p className="text-sm text-gray-400 mt-1">{process.env.SENDER_EMAIL ?? 'Not configured'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Recipient Email</label>
            <p className="text-sm text-gray-400 mt-1">{process.env.RECIPIENT_EMAIL ?? 'Not configured'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
