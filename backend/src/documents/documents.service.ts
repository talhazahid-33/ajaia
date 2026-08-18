import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { RequestUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestDocumentAccess } from './document-access.types';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { appendTiptap, fileToTiptap, titleFromFilename } from './file-import';

type ShareRole = { role: 'EDITOR' | 'VIEWER' };

export const EMPTY_DOCUMENT_CONTENT = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const listSelect = {
  id: true,
  title: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const shareSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    const [owned, shared] = await Promise.all([
      this.prisma.document.findMany({
        where: { ownerId: user.id },
        select: listSelect,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.document.findMany({
        where: {
          ownerId: { not: user.id },
          shares: { some: { userId: user.id } },
        },
        select: {
          ...listSelect,
          shares: {
            where: { userId: user.id },
            select: { role: true },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      owned: owned.map((document) => ({ ...document, access: 'owner' as const })),
      shared: shared.map(({ shares, ...document }) => ({
        ...document,
        access: this.accessFromShare(shares[0]),
      })),
    };
  }

  async create(user: RequestUser, dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: {
        title: dto.title?.trim() || 'Untitled',
        content: EMPTY_DOCUMENT_CONTENT,
        ownerId: user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });
  }

  toDetail(access: RequestDocumentAccess) {
    const { shares: _shares, ...rest } = access.document;
    return {
      ...rest,
      access: access.access,
    };
  }

  async update(access: RequestDocumentAccess, dto: UpdateDocumentDto) {
    const updated = await this.prisma.document.update({
      where: { id: access.document.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined
          ? { content: dto.content as Prisma.InputJsonValue }
          : {}),
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      ...updated,
      access: access.access,
    };
  }

  async importFromFile(user: RequestUser, file?: Express.Multer.File) {
    const content = await fileToTiptap(file);
    const created = await this.prisma.document.create({
      data: {
        title: titleFromFilename(file?.originalname ?? 'Untitled'),
        content: content as Prisma.InputJsonValue,
        ownerId: user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    return { ...created, access: 'owner' as const };
  }

  async appendFromFile(access: RequestDocumentAccess, file?: Express.Multer.File) {
    const imported = await fileToTiptap(file);
    const content = appendTiptap(access.document.content, imported);

    const updated = await this.prisma.document.update({
      where: { id: access.document.id },
      data: { content: content as Prisma.InputJsonValue },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      ...updated,
      access: access.access,
    };
  }

  listShares(access: RequestDocumentAccess) {
    return this.prisma.documentShare.findMany({
      where: { documentId: access.document.id },
      select: shareSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async createShare(user: RequestUser, access: RequestDocumentAccess, dto: CreateShareDto) {
    const email = dto.email.trim().toLowerCase();
    if (email === user.email.toLowerCase()) {
      throw new BadRequestException('You cannot share a document with yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!target) {
      throw new NotFoundException('No user found with that email');
    }

    const existing = await this.prisma.documentShare.findUnique({
      where: {
        documentId_userId: {
          documentId: access.document.id,
          userId: target.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('This user already has access');
    }

    return this.prisma.documentShare.create({
      data: {
        documentId: access.document.id,
        userId: target.id,
        role: dto.role,
      },
      select: shareSelect,
    });
  }

  async updateShare(access: RequestDocumentAccess, shareId: string, dto: UpdateShareDto) {
    await this.findShare(access.document.id, shareId);
    return this.prisma.documentShare.update({
      where: { id: shareId },
      data: { role: dto.role },
      select: shareSelect,
    });
  }

  async deleteShare(access: RequestDocumentAccess, shareId: string) {
    await this.findShare(access.document.id, shareId);
    await this.prisma.documentShare.delete({ where: { id: shareId } });
    return { success: true };
  }

  private async findShare(documentId: string, shareId: string) {
    const share = await this.prisma.documentShare.findFirst({
      where: { id: shareId, documentId },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    return share;
  }

  private accessFromShare(share?: ShareRole) {
    return share?.role === 'EDITOR' ? ('editor' as const) : ('viewer' as const);
  }
}
