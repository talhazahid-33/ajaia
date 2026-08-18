import type { Metadata } from 'next';
import { DocumentsList } from './documents-list';

export const metadata: Metadata = {
  title: 'Documents',
};

export default function DocumentsPage() {
  return <DocumentsList />;
}
