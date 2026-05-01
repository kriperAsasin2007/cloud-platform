import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class UpdateObjectMetadataDto {
  @ApiProperty({ example: 'photos/vacation/sunset.jpg', description: 'Object key (path)' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({
    example: { author: 'alice', project: 'summer-trip' },
    description: 'Custom key-value metadata to attach to the object',
  })
  @IsObject()
  metadata!: Record<string, string>;
}
