import { getContactById, getNotesForContact } from '@/lib/db/queries';
import { EditContactForm, DeleteContactButton } from '@/app/components/edit-contact-form';
import { AddContactNote } from '@/app/components/add-contact-note';
import { LinkedInUrlInput } from '@/app/components/linkedin-url-input';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/timezone';
import type { ContactProfileSchema } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) notFound();

  const notes = await getNotesForContact(id);
  const profile = contact.profileSchema as ContactProfileSchema | null;
  const researchData = contact.researchData as any;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/contacts" className="text-sm text-gray-400 hover:text-[#00BFFF] transition-colors">
          ← Back to Contacts
        </Link>
        <DeleteContactButton contactId={id} />
      </div>

      {/* Contact Info — Edit Form */}
      <div className="rounded-lg border border-gray-800 bg-[#111827] p-6 mb-6">
        <h1 className="text-xl font-bold text-white mb-4">{contact.name}</h1>
        <EditContactForm contact={{
          id: contact.id,
          name: contact.name,
          email: contact.email,
          organization: contact.organization,
          title: (contact as any).title ?? null,
          phone: (contact as any).phone ?? null,
          notes: (contact as any).notes ?? null,
          linkedinUrl: contact.linkedinUrl,
        }} />
      </div>

      {/* LinkedIn URL — show input if not set */}
      {!contact.linkedinUrl && !profile && (
        <div className="rounded-lg border border-gray-800 bg-[#111827] p-4 mb-6">
          <p className="text-sm text-gray-400 mb-2">Add a LinkedIn URL to research this contact</p>
          <LinkedInUrlInput contactId={id} contactName={contact.name} />
        </div>
      )}

      {/* Research Profile */}
      {profile && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-white">Research Profile</h2>

          {/* Brief + Role */}
          <div className="rounded-lg border border-gray-800 bg-[#111827] p-5">
            <p className="text-sm text-gray-200 leading-relaxed">{profile.profile_brief}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#00BFFF] font-medium">{profile.current_role}</span>
              <span className="text-gray-600">at</span>
              <span className="text-sm text-[#00BFFF] font-medium">{profile.current_company}</span>
              {profile.location && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-sm text-gray-400">{profile.location}</span>
                </>
              )}
            </div>
            {profile.data_quality && (
              <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs ${
                profile.data_quality === 'rich' ? 'bg-green-900/50 text-green-300' :
                profile.data_quality === 'moderate' ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {profile.data_quality} data
              </span>
            )}
          </div>

          {/* About */}
          {profile.about_summary && (
            <div className="rounded-lg border border-gray-800 bg-[#111827] p-4">
              <h3 className="font-semibold text-white mb-2">About</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{profile.about_summary}</p>
            </div>
          )}

          {/* Work History */}
          {profile.work_history && profile.work_history.length > 0 && (
            <div className="rounded-lg border border-gray-800 bg-[#111827] p-4">
              <h3 className="font-semibold text-white mb-3">Work History</h3>
              <div className="space-y-3">
                {profile.work_history.map((w, i) => (
                  <div key={i} className="border-l-2 border-gray-700 pl-3">
                    <p className="text-sm font-medium text-gray-200">{w.role}</p>
                    <p className="text-sm text-[#00BFFF]">{w.company}</p>
                    <p className="text-xs text-gray-500">{w.duration}</p>
                    {w.description_summary && <p className="text-sm text-gray-400 mt-1">{w.description_summary}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <div className="rounded-lg border border-gray-800 bg-[#111827] p-4">
              <h3 className="font-semibold text-white mb-3">Education</h3>
              <div className="space-y-2">
                {profile.education.map((e, i) => (
                  <div key={i} className="border-l-2 border-gray-700 pl-3">
                    <p className="text-sm font-medium text-gray-200">{e.institution}</p>
                    {e.degree && <p className="text-sm text-gray-400">{e.degree}{e.field ? ` — ${e.field}` : ''}</p>}
                    {e.years && <p className="text-xs text-gray-500">{e.years}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company Context */}
          {profile.company_context && (
            <div className="rounded-lg border border-gray-800 bg-[#111827] p-4">
              <h3 className="font-semibold text-white mb-2">Company Context</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{profile.company_context}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skills */}
            {profile.key_skills && profile.key_skills.length > 0 && (
              <div className="rounded-lg border border-gray-800 bg-[#111827] p-4">
                <h3 className="font-semibold text-white mb-2">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.key_skills.map((s, i) => (
                    <span key={i} className="rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/20 px-2.5 py-0.5 text-xs text-[#00BFFF]">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Themes */}
            {profile.recent_activity_themes && profile.recent_activity_themes.length > 0 && (
              <div className="rounded-lg border border-gray-800 bg-[#111827] p-4">
                <h3 className="font-semibold text-white mb-2">Recent Activity Themes</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.recent_activity_themes.map((t, i) => (
                    <span key={i} className="rounded-full bg-purple-900/30 border border-purple-800/30 px-2.5 py-0.5 text-xs text-purple-300">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notable Mentions */}
          {profile.notable_mentions && profile.notable_mentions.length > 0 && (
            <div className="rounded-lg border border-gray-800 bg-[#111827] p-4">
              <h3 className="font-semibold text-white mb-2">Notable Mentions</h3>
              <ul className="space-y-1">
                {profile.notable_mentions.map((m, i) => (
                  <li key={i} className="text-sm text-gray-300">• {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Raw Research Data (Tavily) — if no structured profile yet */}
      {!profile && researchData && (
        <div className="rounded-lg border border-gray-800 bg-[#111827] p-4 mb-6">
          <h2 className="font-semibold text-white mb-2">Web Research (Raw)</h2>
          <p className="text-xs text-gray-500 mb-3">Structured profile not yet generated. Raw Tavily results below.</p>
          {Array.isArray(researchData.results) && researchData.results.map((r: any, i: number) => (
            <div key={i} className="mb-3 border-b border-gray-800 pb-3 last:border-0 last:pb-0">
              <a href={r.url} className="text-sm text-[#00BFFF] hover:underline" target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Meeting Notes */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Notes</h2>
        {notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="rounded-md border border-gray-800 bg-[#111827] p-3">
                <p className="text-sm text-gray-300">{note.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {note.noteType.replace('_', ' ')} · {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No notes yet.</p>
        )}
        <AddContactNote contactId={id} />
      </div>

      {/* Metadata */}
      <div className="rounded-lg border border-gray-800 bg-[#111827] p-4 text-xs text-gray-600">
        <p>First seen: {formatDate(contact.firstSeenAt)}</p>
        {contact.lastInteractionAt && <p>Last interaction: {formatDate(contact.lastInteractionAt)}</p>}
        <p>Contact ID: {contact.id}</p>
      </div>
    </div>
  );
}
