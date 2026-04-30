import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstancesService, CreateInstanceDto } from './instances.service';
import { UserId } from '../auth/user-id.decorator';

@ApiTags('instances')
@ApiBearerAuth('access-token')
@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a new instance (async)' })
  async createInstance(
    @UserId() userId: string,
    @Body() dto: CreateInstanceDto,
  ): Promise<{ instanceId: string }> {
    return this.instancesService.requestCreate(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instance info (use WebSocket for live status)' })
  getInstance(
    @Param('id', ParseUUIDPipe) id: string,
  ): { instanceId: string; message: string } {
    return { instanceId: id, message: 'Use WebSocket for real-time status updates' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request instance termination (async)' })
  async terminateInstance(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.instancesService.requestTerminate(id, userId);
  }
}
