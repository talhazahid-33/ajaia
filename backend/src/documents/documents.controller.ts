import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { CurrentDocumentAccess } from './current-document-access.decorator';
import { DocumentAccessGuard } from './document-access.guard';
import type { RequestDocumentAccess } from './document-access.types';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { MAX_IMPORT_BYTES } from './file-import';
import { MulterExceptionFilter } from './multer-exception.filter';
import { RequireAccess } from './require-access.decorator';

const importFileInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMPORT_BYTES },
});

@Controller('documents')
@UseFilters(MulterExceptionFilter)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.documentsService.list(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(user, dto);
  }

  @Post('import')
  @UseInterceptors(importFileInterceptor)
  importFile(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.importFromFile(user, file);
  }

  @Get(':id/shares')
  @UseGuards(DocumentAccessGuard)
  @RequireAccess('owner')
  listShares(@CurrentDocumentAccess() access: RequestDocumentAccess) {
    return this.documentsService.listShares(access);
  }

  @Post(':id/shares')
  @UseGuards(DocumentAccessGuard)
  @RequireAccess('owner')
  createShare(
    @CurrentUser() user: RequestUser,
    @CurrentDocumentAccess() access: RequestDocumentAccess,
    @Body() dto: CreateShareDto,
  ) {
    return this.documentsService.createShare(user, access, dto);
  }

  @Patch(':id/shares/:shareId')
  @UseGuards(DocumentAccessGuard)
  @RequireAccess('owner')
  updateShare(
    @CurrentDocumentAccess() access: RequestDocumentAccess,
    @Param('shareId') shareId: string,
    @Body() dto: UpdateShareDto,
  ) {
    return this.documentsService.updateShare(access, shareId, dto);
  }

  @Delete(':id/shares/:shareId')
  @UseGuards(DocumentAccessGuard)
  @RequireAccess('owner')
  deleteShare(
    @CurrentDocumentAccess() access: RequestDocumentAccess,
    @Param('shareId') shareId: string,
  ) {
    return this.documentsService.deleteShare(access, shareId);
  }

  @Get(':id')
  @UseGuards(DocumentAccessGuard)
  @RequireAccess('viewer')
  findOne(@CurrentDocumentAccess() access: RequestDocumentAccess) {
    return this.documentsService.toDetail(access);
  }

  @Patch(':id')
  @UseGuards(DocumentAccessGuard)
  @RequireAccess('editor')
  update(
    @CurrentDocumentAccess() access: RequestDocumentAccess,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(access, dto);
  }

  @Post(':id/import')
  @UseGuards(DocumentAccessGuard)
  @RequireAccess('editor')
  @UseInterceptors(importFileInterceptor)
  appendImport(
    @CurrentDocumentAccess() access: RequestDocumentAccess,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.appendFromFile(access, file);
  }
}
