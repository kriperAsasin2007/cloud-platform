import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateBucketDto {
  @ApiProperty({
    example: 'my-photos',
    description: '3–63 lowercase alphanumeric characters or hyphens; must start and end with a letter or digit',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'Bucket name must contain only lowercase letters, digits, and hyphens, and must start and end with a letter or digit',
  })
  name!: string;
}
