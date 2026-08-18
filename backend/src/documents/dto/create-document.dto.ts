import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;
}
