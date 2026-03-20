import Link from 'next/link';
import { getAllContacts } from '@/lib/db/queries';
import { formatDate } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const allContacts = await getAllContacts(search);
  // Filter out internal team members
  const contacts = allContacts.filter(c => !c.email.endsWith('@lemnisca.bio'));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Contacts</h1>

      <form className="mb-6">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search contacts..."
          className="w-full max-w-md rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#00BFFF] focus:outline-none"
        />
      </form>

      {contacts.length === 0 ? (
        <p className="text-gray-400">No contacts found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map(contact => {
            const profile = contact.profileSchema as any;
            const title = (contact as any).title;
            const phone = (contact as any).phone;
            return (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="rounded-lg border border-gray-800 bg-[#111827] p-4 hover:border-[#00BFFF]/30 transition-colors"
              >
                <p className="font-medium text-white">{contact.name}</p>
                {title && (
                  <p className="text-sm text-[#00BFFF]">{title}</p>
                )}
                <p className="text-sm text-gray-400">{contact.organization ?? contact.email}</p>
                {phone && (
                  <p className="text-xs text-gray-500 mt-1">{phone}</p>
                )}
                {contact.lastInteractionAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last: {formatDate(contact.lastInteractionAt)}
                  </p>
                )}
                {profile?.data_quality && (
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                    profile.data_quality === 'rich' ? 'bg-green-900/50 text-green-300' :
                    profile.data_quality === 'moderate' ? 'bg-yellow-900/50 text-yellow-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {profile.data_quality}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
