import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InstancesService, CreateInstanceDto } from './instances.service';

function requireUserId(userId: string | undefined): asserts userId is string {
  if (!userId) throw new BadRequestException('x-user-id header is required');
}

@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createInstance(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateInstanceDto,
  ): Promise<{ instanceId: string }> {
    requireUserId(userId);
    return this.instancesService.requestCreate(userId, dto);
  }

  @Get(':id')
  getInstance(
    @Param('id', ParseUUIDPipe) id: string,
  ): { instanceId: string; message: string } {
    return { instanceId: id, message: 'Use WebSocket for real-time status updates' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateInstance(
    @Headers('x-user-id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    requireUserId(userId);
    await this.instancesService.requestTerminate(id, userId);
  }
}
