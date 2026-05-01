import { IsNotEmpty, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateBucketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'Bucket name must contain only lowercase letters, digits, and hyphens, and must start and end with a letter or digit',
  })
  name!: string;

  @IsUUID()
  userId!: string;
}
