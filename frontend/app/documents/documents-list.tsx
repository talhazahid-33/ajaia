'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadButton } from '@/components/file-upload-button';
import { clearUser, useCurrentUser } from '@/lib/auth';
import {
  assertImportableFile,
  createDocument,
  deleteDocument,
  importDocument,
  listDocuments,
  updateDocument,
  type DocumentListItem,
} from '@/lib/documents';

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function DocumentsList() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [owned, setOwned] = useState<DocumentListItem[]>([]);
  const [shared, setShared] = useState<DocumentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    listDocuments()
      .then((data) => {
        setOwned(data.owned);
        setShared(data.shared);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      })
      .finally(() => setLoading(false));
  }, []);

  async function onCreate() {
    setCreating(true);
    setError(null);
    try {
      const document = await createDocument();
      router.push(`/documents/${document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
      setCreating(false);
    }
  }

  async function onRename(id: string, title: string, access: DocumentListItem['access']) {
    const nextTitle = title.trim() || 'Untitled';
    const updated = await updateDocument(id, { title: nextTitle });
    const apply = (items: DocumentListItem[]) =>
      items.map((item) => (item.id === id ? { ...item, title: updated.title } : item));

    if (access === 'owner') {
      setOwned(apply);
    } else {
      setShared(apply);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteDocument(id);
      setOwned((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      assertImportableFile(file);
      const document = await importDocument(file);
      router.push(`/documents/${document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
      setUploading(false);
    }
  }

  function onSignOut() {
    clearUser();
    router.replace('/login');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Ajaia</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Documents</h1>
          {user ? (
            <p className="mt-1 text-sm text-zinc-500">{user.name}</p>
          ) : null}
          <p className="mt-1 text-xs text-zinc-500">Supported: .txt, .md, .docx</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSignOut}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || uploading}
            className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {creating ? 'Creating…' : 'New document'}
          </button>
          <FileUploadButton
            label="Upload file"
            busyLabel="Uploading…"
            busy={uploading}
            disabled={creating}
            onFile={(file) => void onUpload(file)}
          />
        </div>
      </header>

      {error ? (
        <p className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading documents…</p>
      ) : (
        <div className="flex flex-col gap-10">
          <DocumentSection
            title="Your documents"
            empty="You have not created any documents yet."
            documents={owned}
            onRename={onRename}
            onDelete={onDelete}
          />
          <DocumentSection
            title="Shared with you"
            empty="Nothing has been shared with you yet."
            documents={shared}
            onRename={onRename}
            showOwner
          />
        </div>
      )}
    </div>
  );
}

function DocumentSection({
  title,
  empty,
  documents,
  onRename,
  onDelete,
  showOwner = false,
}: {
  title: string;
  empty: string;
  documents: DocumentListItem[];
  onRename: (
    id: string,
    title: string,
    access: DocumentListItem['access'],
  ) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  showOwner?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-zinc-500">{title}</h2>
      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              showOwner={showOwner}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function DocumentRow({
  document,
  showOwner,
  onRename,
  onDelete,
}: {
  document: DocumentListItem;
  showOwner: boolean;
  onRename: (
    id: string,
    title: string,
    access: DocumentListItem['access'],
  ) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canManage = document.access === 'owner';

  async function submitRename(event?: FormEvent) {
    event?.preventDefault();
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await onRename(document.id, title, document.access);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function submitDelete() {
    if (!onDelete || deleting) {
      return;
    }
    if (!window.confirm(`Delete “${document.title}”? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(document.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {editing ? (
        <form onSubmit={submitRename} className="flex min-w-0 flex-1 items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void submitRename()}
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-transparent px-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700"
          />
        </form>
      ) : (
        <Link href={`/documents/${document.id}`} className="min-w-0 flex-1">
          <p className="truncate font-medium">{document.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {showOwner
              ? `${document.owner.name} · ${document.access === 'editor' ? 'Editor' : 'Viewer'} · `
              : null}
            Updated {formatUpdatedAt(document.updatedAt)}
          </p>
        </Link>
      )}
      {editing || !canManage ? null : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setTitle(document.title);
              setEditing(true);
            }}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => void submitDelete()}
            disabled={deleting}
            title="Delete document"
            aria-label="Delete document"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <DeleteIcon />
          </button>
        </div>
      )}
    </li>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 6.5h10M8 6.5V5h4v1.5M7 6.5v8.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
