import { BadRequestException } from '@nestjs/common';
import { generateJSON } from '@tiptap/html/server';
import StarterKit from '@tiptap/starter-kit';
import mammoth from 'mammoth';
import { marked } from 'marked';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['.txt', '.md', '.docx'] as const;

export type TiptapDoc = {
  type: 'doc';
  content: unknown[];
};

type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export function getFileExtension(filename: string) {
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index).toLowerCase() : '';
}

export function titleFromFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '').trim();
  return base || 'Untitled';
}

export function assertImportFile(
  file?: Express.Multer.File,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException('File is required');
  }

  if (file.size > MAX_IMPORT_BYTES) {
    throw new BadRequestException('File must be 5MB or smaller');
  }

  const extension = getFileExtension(file.originalname);
  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    throw new BadRequestException('Supported file types: .txt, .md, .docx');
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtml(text: string) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n').map(escapeHtml).join('<br>');
      return `<p>${lines || '<br>'}</p>`;
    })
    .join('');
}

function htmlToTiptap(html: string): TiptapDoc {
  const json = generateJSON(html || '<p></p>', [StarterKit]);
  const content = Array.isArray(json.content) ? json.content : [];
  return {
    type: 'doc',
    content,
  };
}

export async function fileToTiptap(file?: Express.Multer.File): Promise<TiptapDoc> {
  assertImportFile(file);
  const extension = getFileExtension(file.originalname) as AllowedExtension;

  if (extension === '.txt') {
    return htmlToTiptap(textToHtml(file.buffer.toString('utf8')));
  }

  if (extension === '.md') {
    const html = await marked.parse(file.buffer.toString('utf8'));
    return htmlToTiptap(html);
  }

  const result = await mammoth.convertToHtml({ buffer: file.buffer });
  return htmlToTiptap(result.value);
}

export function appendTiptap(existing: unknown, imported: TiptapDoc): TiptapDoc {
  const existingContent = Array.isArray((existing as { content?: unknown[] })?.content)
    ? ((existing as { content: unknown[] }).content)
    : [];
  const importedContent = imported.content ?? [];
  const needsGap = existingContent.length > 0 && importedContent.length > 0;

  return {
    type: 'doc',
    content: [
      ...existingContent,
      ...(needsGap ? [{ type: 'paragraph' }] : []),
      ...importedContent,
    ],
  };
}
