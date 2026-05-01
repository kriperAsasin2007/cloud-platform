import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StorageClientService } from '@cloud-platform-app/storage-client';
import { AuthenticatedRequest } from '../auth/jwt.middleware';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { UpdateObjectMetadataDto } from './dto/update-object-metadata.dto';
import { CreateFolderDto } from './dto/create-folder.dto';

@ApiTags('storage')
@ApiBearerAuth('access-token')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageClient: StorageClientService) {}

  // ── Buckets ────────────────────────────────────────────────────────────────

  @Post('buckets')
  @ApiOperation({ summary: 'Create a new bucket' })
  createBucket(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBucketDto,
  ) {
    return this.storageClient.createBucket(req.userId, dto.name);
  }

  @Get('buckets')
  @ApiOperation({ summary: 'List all buckets for the authenticated user' })
  listBuckets(@Req() req: AuthenticatedRequest) {
    return this.storageClient.listBuckets(req.userId);
  }

  @Delete('buckets/:name')
  @ApiOperation({ summary: 'Delete a bucket and all its contents' })
  @ApiParam({ name: 'name', description: 'Bucket display name' })
  deleteBucket(
    @Req() req: AuthenticatedRequest,
    @Param('name') name: string,
  ) {
    return this.storageClient.deleteBucket(req.userId, name);
  }

  // ── Objects ────────────────────────────────────────────────────────────────

  @Post('buckets/:bucket/objects')
  @ApiOperation({ summary: 'Upload a file to a bucket' })
  @ApiParam({ name: 'bucket', description: 'Bucket display name' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload' },
        key: { type: 'string', description: 'Object key (path). Defaults to original filename.' },
        metadata: { type: 'string', description: 'JSON string of custom metadata, e.g. {"tag":"value"}' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadObject(
    @Req() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('key') key: string,
    @Body('metadata') metadataStr: string,
  ) {
    const metadata = metadataStr ? JSON.parse(metadataStr) : undefined;
    return this.storageClient.uploadObject(
      req.userId,
      bucket,
      file.buffer,
      file.originalname,
      file.mimetype,
      key,
      metadata,
    );
  }

  @Get('buckets/:bucket/objects')
  @ApiOperation({ summary: 'List objects in a bucket' })
  @ApiParam({ name: 'bucket', description: 'Bucket display name' })
  @ApiQuery({ name: 'prefix', required: false, description: 'Key prefix filter (simulates folder navigation)' })
  @ApiQuery({ name: 'recursive', required: false, type: Boolean, description: 'List all nested objects recursively' })
  listObjects(
    @Req() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @Query('prefix') prefix?: string,
    @Query('recursive', new ParseBoolPipe({ optional: true })) recursive?: boolean,
  ) {
    return this.storageClient.listObjects(req.userId, bucket, prefix, recursive);
  }

  @Get('buckets/:bucket/objects/download')
  @ApiOperation({ summary: 'Download a file from a bucket' })
  @ApiParam({ name: 'bucket', description: 'Bucket display name' })
  @ApiQuery({ name: 'key', required: true, description: 'Object key (path)' })
  async downloadObject(
    @Req() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const response = await this.storageClient.downloadObject(req.userId, bucket, key);
    res.setHeader('Content-Type', response.headers['content-type'] ?? 'application/octet-stream');
    const disposition = response.headers['content-disposition'];
    if (disposition) res.setHeader('Content-Disposition', disposition);
    response.data.pipe(res);
  }

  @Get('buckets/:bucket/objects/stat')
  @ApiOperation({ summary: 'Get metadata and stats for an object' })
  @ApiParam({ name: 'bucket', description: 'Bucket display name' })
  @ApiQuery({ name: 'key', required: true, description: 'Object key (path)' })
  statObject(
    @Req() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @Query('key') key: string,
  ) {
    return this.storageClient.statObject(req.userId, bucket, key);
  }

  @Delete('buckets/:bucket/objects')
  @ApiOperation({ summary: 'Delete an object from a bucket' })
  @ApiParam({ name: 'bucket', description: 'Bucket display name' })
  @ApiQuery({ name: 'key', required: true, description: 'Object key (path)' })
  deleteObject(
    @Req() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @Query('key') key: string,
  ) {
    return this.storageClient.deleteObject(req.userId, bucket, key);
  }

  @Patch('buckets/:bucket/objects/metadata')
  @ApiOperation({ summary: 'Update custom metadata for an object' })
  @ApiParam({ name: 'bucket', description: 'Bucket display name' })
  updateObjectMetadata(
    @Req() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @Body() dto: UpdateObjectMetadataDto,
  ) {
    return this.storageClient.updateObjectMetadata(req.userId, bucket, dto.key, dto.metadata);
  }

  // ── Folders ────────────────────────────────────────────────────────────────

  @Post('buckets/:bucket/folders')
  @ApiOperation({ summary: 'Create a virtual folder in a bucket' })
  @ApiParam({ name: 'bucket', description: 'Bucket display name' })
  createFolder(
    @Req() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.storageClient.createFolder(req.userId, bucket, dto.path);
  }

  // ── Metrics ────────────────────────────────────────────────────────────────

  @Get('metrics')
  @ApiOperation({ summary: 'Get real-time storage metrics for the authenticated user' })
  getMetrics(@Req() req: AuthenticatedRequest) {
    return this.storageClient.getStorageMetrics(req.userId);
  }
}
