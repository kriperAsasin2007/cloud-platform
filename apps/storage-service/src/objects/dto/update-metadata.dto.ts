import { IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';

export class UpdateMetadataDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsObject()
  metadata!: Record<string, string>;
}
