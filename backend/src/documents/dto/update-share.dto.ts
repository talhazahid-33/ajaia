import { IsEnum } from 'class-validator';
import { DocumentShareRole } from '../../generated/prisma/client';

export class UpdateShareDto {
  @IsEnum(DocumentShareRole)
  role: DocumentShareRole;
}
