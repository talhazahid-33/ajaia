'use client';

import { useRef } from 'react';
import { IMPORT_ACCEPT } from '@/lib/documents';

export function FileUploadButton({
  label,
  busyLabel,
  busy = false,
  disabled = false,
  className,
  onFile,
}: {
  label: string;
  busyLabel: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            onFile(file);
          }
        }}
      />
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        className={
          className ??
          'h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium disabled:opacity-60 dark:border-zinc-700'
        }
      >
        {busy ? busyLabel : label}
      </button>
    </>
  );
}
