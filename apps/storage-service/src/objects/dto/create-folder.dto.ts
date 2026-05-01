import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateFolderDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  path!: string;
}
