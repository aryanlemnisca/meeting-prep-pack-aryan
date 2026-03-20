'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EditContactFormProps {
  contact: {
    id: string;
    name: string;
    email: string;
    organization: string | null;
    title: string | null;
    phone: string | null;
    notes: string | null;
    linkedinUrl: string | null;
  };
}

export function EditContactForm({ contact }: EditContactFormProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email,
    organization: contact.organization ?? '',
    title: contact.title ?? '',
    phone: contact.phone ?? '',
    notes: contact.notes ?? '',
    linkedinUrl: contact.linkedinUrl ?? '',
  });
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update contact:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Name" value={contact.name} />
          <InfoField label="Email" value={contact.email} />
          <InfoField label="Organization" value={contact.organization} />
          <InfoField label="Title" value={contact.title} />
          <InfoField label="Phone" value={contact.phone} />
          <InfoField label="LinkedIn" value={contact.linkedinUrl} isLink />
        </div>
        {contact.notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-300">{contact.notes}</p>
          </div>
        )}
        <button
          onClick={() => setEditing(true)}
          className="mt-2 rounded-md bg-[#1F2937] border border-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
        >
          Edit Contact
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
        <FormField label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" required />
        <FormField label="Organization" value={form.organization} onChange={v => setForm({ ...form, organization: v })} />
        <FormField label="Title / Role" value={form.title} onChange={v => setForm({ ...form, title: v })} />
        <FormField label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} type="tel" />
        <FormField label="LinkedIn URL" value={form.linkedinUrl} onChange={v => setForm({ ...form, linkedinUrl: v })} type="url" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF] focus:outline-none"
          placeholder="General notes about this contact..."
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-[#00BFFF] px-4 py-2 text-sm font-medium text-black hover:bg-[#0EA5E9] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md bg-[#1F2937] border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteContactButton({ contactId }: { contactId: string }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
    router.push('/contacts');
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-md bg-red-900/30 border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 transition-colors"
      >
        Delete Contact
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-400">Are you sure?</span>
      <button
        onClick={handleDelete}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 transition-colors"
      >
        Yes, delete
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-md bg-[#1F2937] px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export { DeleteContactButton };

function InfoField({ label, value, isLink }: { label: string; value: string | null; isLink?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
      {value ? (
        isLink ? (
          <a href={value} className="text-sm text-[#00BFFF] hover:underline" target="_blank" rel="noopener noreferrer">{value}</a>
        ) : (
          <p className="text-sm text-gray-200">{value}</p>
        )
      ) : (
        <p className="text-sm text-gray-600">—</p>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF] focus:outline-none"
      />
    </div>
  );
}
