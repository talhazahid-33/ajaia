import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { RequestDocumentAccess } from './document-access.types';

export const CurrentDocumentAccess = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestDocumentAccess => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { documentAccess: RequestDocumentAccess }>();
    return request.documentAccess;
  },
);
