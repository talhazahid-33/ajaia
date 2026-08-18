import { IsEmail, IsEnum } from 'class-validator';
import { DocumentShareRole } from '../../generated/prisma/client';

export class CreateShareDto {
  @IsEmail()
  email: string;

  @IsEnum(DocumentShareRole)
  role: DocumentShareRole;
}
