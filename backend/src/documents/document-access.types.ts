export type DocumentAccessLevel = 'owner' | 'editor' | 'viewer';

export const DOCUMENT_ACCESS_RANK: Record<DocumentAccessLevel, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export type RequestDocumentAccess = {
  access: DocumentAccessLevel;
  document: {
    id: string;
    title: string;
    content: unknown;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    owner: { id: string; name: string };
    shares: { role: 'EDITOR' | 'VIEWER' }[];
  };
};

export const DOCUMENT_ACCESS_KEY = 'documentAccess';
