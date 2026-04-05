import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket): void {
    // Client must send userId in handshake auth: { auth: { userId: '...' } }
    const userId = client.handshake.auth?.['userId'] as string | undefined;
    if (!userId) {
      this.logger.warn(`Client ${client.id} connected without userId — disconnecting`);
      client.disconnect();
      return;
    }
    client.join(userId);
    this.logger.log(`Client ${client.id} joined room for user ${userId}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  pushToUser(userId: string, event: string, data: unknown): void {
    this.server.to(userId).emit(event, data);
  }
}
