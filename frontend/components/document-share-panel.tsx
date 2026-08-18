'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  createShare,
  deleteShare,
  listShares,
  updateShare,
  type DocumentShare,
  type ShareRole,
} from '@/lib/documents';

export function DocumentSharePanel({ documentId }: { documentId: string }) {
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('VIEWER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listShares(documentId)
      .then(setShares)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load shares');
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const share = await createShare(documentId, { email: email.trim(), role });
      setShares((current) => [...current, share]);
      setEmail('');
      setRole('VIEWER');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share document');
    } finally {
      setSaving(false);
    }
  }

  async function onRoleChange(shareId: string, nextRole: ShareRole) {
    setError(null);
    try {
      const updated = await updateShare(documentId, shareId, nextRole);
      setShares((current) => current.map((share) => (share.id === shareId ? updated : share)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function onRemove(shareId: string) {
    setError(null);
    try {
      await deleteShare(documentId, shareId);
      setShares((current) => current.filter((share) => share.id !== shareId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove access');
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-medium text-zinc-500">Share</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Editors can change content. Only you can rename. Viewers can read only.
      </p>

      <form onSubmit={onAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@example.com"
          className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-transparent px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as ShareRole)}
          className="h-10 rounded-lg border border-zinc-200 bg-transparent px-2 text-sm dark:border-zinc-700"
        >
          <option value="VIEWER">Viewer</option>
          <option value="EDITOR">Editor</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {saving ? 'Sharing…' : 'Share'}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading people…</p>
      ) : shares.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Not shared with anyone yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          {shares.map((share) => (
            <li key={share.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{share.user.name}</p>
                <p className="truncate text-xs text-zinc-500">{share.user.email}</p>
              </div>
              <select
                value={share.role}
                onChange={(event) => void onRoleChange(share.id, event.target.value as ShareRole)}
                className="h-9 rounded-md border border-zinc-200 bg-transparent px-2 text-sm dark:border-zinc-700"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
              <button
                type="button"
                onClick={() => void onRemove(share.id)}
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
