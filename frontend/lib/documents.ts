import { apiClient } from './api';

export type DocumentAccess = 'owner' | 'editor' | 'viewer';

export type DocumentOwner = {
  id: string;
  name: string;
};

export type DocumentListItem = {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  access: DocumentAccess;
  owner: DocumentOwner;
};

export type DocumentDetail = DocumentListItem & {
  content: Record<string, unknown>;
};

export type DocumentListResponse = {
  owned: DocumentListItem[];
  shared: DocumentListItem[];
};

export function listDocuments() {
  return apiClient.get<DocumentListResponse>('/documents');
}

export function createDocument(title?: string) {
  return apiClient.post<DocumentDetail>('/documents', title ? { title } : {});
}

export function getDocument(id: string) {
  return apiClient.get<DocumentDetail>(`/documents/${id}`);
}

export function updateDocument(
  id: string,
  data: { title?: string; content?: Record<string, unknown> },
) {
  return apiClient.patch<DocumentDetail>(`/documents/${id}`, data);
}

export const IMPORT_ACCEPT = '.txt,.md,.docx';
export const IMPORT_EXTENSIONS = ['.txt', '.md', '.docx'] as const;
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export function assertImportableFile(file: File) {
  const name = file.name.toLowerCase();
  if (!IMPORT_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    throw new Error('Supported file types: .txt, .md, .docx');
  }

  if (file.size > IMPORT_MAX_BYTES) {
    throw new Error('File must be 5MB or smaller');
  }
}

export function importDocument(file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiClient.postForm<DocumentDetail>('/documents/import', form);
}

export function importIntoDocument(id: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiClient.postForm<DocumentDetail>(`/documents/${id}/import`, form);
}

export type ShareRole = 'EDITOR' | 'VIEWER';

export type DocumentShare = {
  id: string;
  role: ShareRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export function listShares(documentId: string) {
  return apiClient.get<DocumentShare[]>(`/documents/${documentId}/shares`);
}

export function createShare(documentId: string, data: { email: string; role: ShareRole }) {
  return apiClient.post<DocumentShare>(`/documents/${documentId}/shares`, data);
}

export function updateShare(documentId: string, shareId: string, role: ShareRole) {
  return apiClient.patch<DocumentShare>(`/documents/${documentId}/shares/${shareId}`, { role });
}

export function deleteShare(documentId: string, shareId: string) {
  return apiClient.delete<{ success: boolean }>(`/documents/${documentId}/shares/${shareId}`);
}
