import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DocumentEditorPage } from './document-editor-page';

export const metadata: Metadata = {
  title: 'Document',
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Loading document…
        </div>
      }
    >
      <DocumentEditorPage />
    </Suspense>
  );
}
