import { Module } from '@nestjs/common';
import { DocumentAccessGuard } from './document-access.guard';
import { DocumentsController } from './documents.controller';
import { DocumentsGateway } from './documents.gateway';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentAccessGuard, DocumentsGateway],
})
export class DocumentsModule {}
