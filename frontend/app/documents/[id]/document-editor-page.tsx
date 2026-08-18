'use client';

import { useParams } from 'next/navigation';
import { DocumentEditor } from '@/components/document-editor';

export function DocumentEditorPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!id) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Missing document.
      </div>
    );
  }

  return <DocumentEditor id={id} />;
}
