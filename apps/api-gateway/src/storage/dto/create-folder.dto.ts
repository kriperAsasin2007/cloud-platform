import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ example: 'photos/vacation', description: 'Folder path (no leading/trailing slash needed)' })
  @IsString()
  @IsNotEmpty()
  path!: string;
}
