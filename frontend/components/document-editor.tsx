'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FileUploadButton } from '@/components/file-upload-button';
import { DocumentSharePanel } from '@/components/document-share-panel';
import {
  assertImportableFile,
  getDocument,
  importIntoDocument,
  updateDocument,
  type DocumentDetail,
} from '@/lib/documents';
import { useDocumentPresence, type PresenceUser } from '@/lib/presence';

type SaveStatus = 'saved' | 'saving' | 'error';

const SAVE_DELAY_MS = 2000;

export function DocumentEditor({ id }: { id: string }) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDocument(id)
      .then((data) => {
        if (!cancelled) {
          setDocument(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load document');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
        <Link href="/documents" className="mb-6 text-sm text-zinc-500 hover:text-zinc-900">
          Back to documents
        </Link>
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {loadError}
        </p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Loading document…
      </div>
    );
  }

  return <DocumentEditorLoaded key={document.id} document={document} />;
}

function DocumentEditorLoaded({ document }: { document: DocumentDetail }) {
  const canRename = document.access === 'owner';
  const canEdit = document.access !== 'viewer';
  const [title, setTitle] = useState(document.title);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const viewers = useDocumentPresence(document.id);
  const pendingContent = useRef<Record<string, unknown> | null>(null);
  const lastSaved = useRef(JSON.stringify(document.content));
  const savedTitle = useRef(document.title);
  const saveTimer = useRef<number | null>(null);

  async function flushContent(content: Record<string, unknown>) {
    if (!canEdit) {
      return;
    }

    setStatus('saving');
    try {
      await updateDocument(document.id, { content });
      lastSaved.current = JSON.stringify(content);
      pendingContent.current = null;
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  function scheduleContentSave(content: Record<string, unknown>) {
    if (!canEdit || JSON.stringify(content) === lastSaved.current) {
      return;
    }

    pendingContent.current = content;
    setStatus('saving');
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      void flushContent(content);
    }, SAVE_DELAY_MS);
  }

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: document.content,
    editable: canEdit,
    editorProps: {
      attributes: {
        class: 'tiptap px-1 py-2',
      },
    },
    onUpdate: ({ editor: instance }) => {
      scheduleContentSave(instance.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      const content = pendingContent.current;
      if (canEdit && content) {
        void updateDocument(document.id, { content });
      }
    };
  }, [canEdit, document.id]);

  async function saveTitle() {
    if (!canRename) {
      return;
    }

    const nextTitle = title.trim() || 'Untitled';
    if (nextTitle === savedTitle.current) {
      setTitle(nextTitle);
      return;
    }

    setStatus('saving');
    try {
      await updateDocument(document.id, { title: nextTitle });
      savedTitle.current = nextTitle;
      setTitle(nextTitle);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  async function onImport(file: File) {
    if (!canEdit || !editor) {
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      assertImportableFile(file);
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      pendingContent.current = null;
      const updated = await importIntoDocument(document.id, file);
      lastSaved.current = JSON.stringify(updated.content);
      editor.commands.setContent(updated.content);
      setStatus('saved');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setImporting(false);
    }
  }

  async function onRefresh() {
    if (!editor || refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      pendingContent.current = null;
      const latest = await getDocument(document.id);
      lastSaved.current = JSON.stringify(latest.content);
      savedTitle.current = latest.title;
      setTitle(latest.title);
      editor.commands.setContent(latest.content);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/documents" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Back to documents
        </Link>
        <div className="flex items-center gap-3">
          <PresenceAvatars viewers={viewers} />
          {canEdit ? (
            <FileUploadButton
              label="Import file"
              busyLabel="Importing…"
              busy={importing}
              disabled={!editor}
              className="h-9 rounded-lg border border-zinc-200 px-3 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
              onFile={(file) => void onImport(file)}
            />
          ) : null}
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={!editor || refreshing}
            title="Refresh document"
            aria-label="Refresh document"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <RefreshIcon spinning={refreshing} />
          </button>
          <p className="text-xs text-zinc-500">
            {status === 'error'
              ? document.access === 'viewer'
                ? 'Refresh failed'
                : 'Save failed'
              : document.access === 'viewer'
                ? 'View only'
                : status === 'saving'
                  ? 'Saving…'
                  : 'Saved'}
            {document.access === 'owner'
              ? null
              : ` · ${document.access === 'editor' ? 'Editor' : 'Viewer'} · Shared by ${document.owner.name}`}
          </p>
        </div>
      </div>

      {canEdit ? (
        <p className="mb-3 text-xs text-zinc-500">Supported: .txt, .md, .docx. Import appends to this document.</p>
      ) : null}

      {importError ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {importError}
        </p>
      ) : null}
      <input
        value={title}
        readOnly={!canRename}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => void saveTitle()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        className="mb-4 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none"
      />

      {editor ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
          {canEdit ? (
            <div className="flex flex-wrap gap-1 border-b border-zinc-200 p-2 dark:border-zinc-800">
            <ToolbarButton
              label="Bold"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              label="Italic"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              label="Underline"
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              label="H1"
              active={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              label="H2"
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              label="List"
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              label="1."
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
            </div>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Loading editor…</p>
      )}

      {document.access === 'owner' ? <DocumentSharePanel documentId={document.id} /> : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function PresenceAvatars({ viewers }: { viewers: PresenceUser[] }) {
  if (viewers.length === 0) {
    return null;
  }

  return (
    <ul className="flex items-center -space-x-1.5" aria-label="People viewing this document">
      {viewers.map((viewer) => (
        <li key={viewer.id} title={viewer.name}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-200 text-[10px] font-medium text-zinc-700 dark:border-zinc-950 dark:bg-zinc-700 dark:text-zinc-100">
            {initials(viewer.name)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}
    >
      <path
        d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5V7h-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
        active
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  );
}
