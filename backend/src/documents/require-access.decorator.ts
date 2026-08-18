import { SetMetadata } from '@nestjs/common';
import type { DocumentAccessLevel } from './document-access.types';
import { DOCUMENT_ACCESS_KEY } from './document-access.types';

export const RequireAccess = (level: DocumentAccessLevel) =>
  SetMetadata(DOCUMENT_ACCESS_KEY, level);
