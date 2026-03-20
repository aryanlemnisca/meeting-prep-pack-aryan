import { getBlocklist } from '@/lib/db/queries';
import { BlocklistForm } from '@/app/components/blocklist-form';

export const dynamic = 'force-dynamic';

export default async function BlocklistPage() {
  const entries = await getBlocklist();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Blocklist</h1>
      <p className="text-sm text-gray-400 mb-4">Meetings with these exact titles will be excluded from prep pack generation.</p>

      <BlocklistForm entries={entries.map(e => ({ id: e.id, titlePattern: e.titlePattern }))} />
    </div>
  );
}
