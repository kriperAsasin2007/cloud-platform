import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadObjectDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;
}
