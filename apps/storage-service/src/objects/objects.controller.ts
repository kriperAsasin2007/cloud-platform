import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { InternalJwtGuard } from '@cloud-platform-app/auth';
import { ObjectsService } from './objects.service';
import { UpdateMetadataDto } from './dto/update-metadata.dto';
import { CreateFolderDto } from './dto/create-folder.dto';

@Controller('storage/buckets/:bucket')
@UseGuards(InternalJwtGuard)
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Post('objects')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('bucket') bucket: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('userId', ParseUUIDPipe) userId: string,
    @Body('key') key: string,
    @Body('metadata') metadataStr: string,
  ) {
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    return this.objectsService.upload(userId, bucket, file, key, metadata);
  }

  @Get('objects')
  list(
    @Param('bucket') bucket: string,
    @Query('userId', ParseUUIDPipe) userId: string,
    @Query('prefix') prefix?: string,
    @Query('recursive', new ParseBoolPipe({ optional: true })) recursive?: boolean,
  ) {
    return this.objectsService.list(userId, bucket, prefix, recursive);
  }

  @Get('objects/download')
  async download(
    @Param('bucket') bucket: string,
    @Query('userId', ParseUUIDPipe) userId: string,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const { stream, stat } = await this.objectsService.download(userId, bucket, key);
    res.setHeader('Content-Type', stat.contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
    stream.pipe(res);
  }

  @Get('objects/stat')
  stat(
    @Param('bucket') bucket: string,
    @Query('userId', ParseUUIDPipe) userId: string,
    @Query('key') key: string,
  ) {
    return this.objectsService.stat(userId, bucket, key);
  }

  @Delete('objects')
  deleteObject(
    @Param('bucket') bucket: string,
    @Query('userId', ParseUUIDPipe) userId: string,
    @Query('key') key: string,
  ) {
    return this.objectsService.deleteObject(userId, bucket, key);
  }

  @Patch('objects/metadata')
  updateMetadata(
    @Param('bucket') bucket: string,
    @Body() dto: UpdateMetadataDto,
  ) {
    return this.objectsService.updateMetadata(dto.userId, bucket, dto.key, dto.metadata);
  }

  @Post('folders')
  createFolder(
    @Param('bucket') bucket: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.objectsService.createFolder(dto.userId, bucket, dto.path);
  }
}
