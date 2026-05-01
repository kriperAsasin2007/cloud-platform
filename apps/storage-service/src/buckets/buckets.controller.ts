import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalJwtGuard } from '@cloud-platform-app/auth';
import { BucketsService } from './buckets.service';
import { CreateBucketDto } from './dto/create-bucket.dto';

@Controller('storage/buckets')
@UseGuards(InternalJwtGuard)
export class BucketsController {
  constructor(private readonly bucketsService: BucketsService) {}

  @Post()
  create(@Body() dto: CreateBucketDto) {
    return this.bucketsService.create(dto);
  }

  @Get()
  list(@Query('userId', ParseUUIDPipe) userId: string) {
    return this.bucketsService.list(userId);
  }

  @Delete(':name')
  delete(
    @Param('name') name: string,
    @Query('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.bucketsService.delete(userId, name);
  }
}
