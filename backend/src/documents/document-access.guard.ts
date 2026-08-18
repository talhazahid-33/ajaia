import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  DOCUMENT_ACCESS_KEY,
  DOCUMENT_ACCESS_RANK,
  type DocumentAccessLevel,
  type RequestDocumentAccess,
} from './document-access.types';

@Injectable()
export class DocumentAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<DocumentAccessLevel>(
      DOCUMENT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { user: RequestUser; documentAccess?: RequestDocumentAccess }
    >();
    const user = request.user;
    const rawId = request.params.id;
    const documentId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!documentId) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }],
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        shares: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const access: DocumentAccessLevel =
      document.ownerId === user.id
        ? 'owner'
        : document.shares[0]?.role === 'EDITOR'
          ? 'editor'
          : 'viewer';

    if (DOCUMENT_ACCESS_RANK[access] < DOCUMENT_ACCESS_RANK[required]) {
      throw new ForbiddenException(
        required === 'owner'
          ? 'Only the owner can do this'
          : 'You can view this document but cannot edit it',
      );
    }

    const body = request.body as { title?: unknown } | undefined;
    if (
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      body.title !== undefined &&
      access !== 'owner'
    ) {
      throw new ForbiddenException('Name can only be changed by the owner');
    }

    request.documentAccess = { access, document };
    return true;
  }
}
