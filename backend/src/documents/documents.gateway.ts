import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

type PresenceUser = {
  id: string;
  name: string;
};

@WebSocketGateway({ cors: { origin: true } })
export class DocumentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly sockets = new Map<string, Map<string, PresenceUser>>();
  private readonly socketRooms = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;
    if (typeof userId !== 'string' || !userId) {
      client.disconnect();
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      client.disconnect();
      return;
    }

    client.data.user = user;
  }

  private async resolveUser(client: Socket): Promise<PresenceUser | null> {
    const existing = client.data.user as PresenceUser | undefined;
    if (existing?.id && existing.name) {
      return existing;
    }

    const userId = client.handshake.auth?.userId;
    if (typeof userId !== 'string' || !userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (user) {
      client.data.user = user;
    }
    return user;
  }

  handleDisconnect(client: Socket) {
    void this.leaveCurrentRoom(client);
  }

  @SubscribeMessage('joinDocument')
  async joinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() documentId: string,
  ) {
    const user = await this.resolveUser(client);
    if (!user || typeof documentId !== 'string' || !documentId) {
      return;
    }

    const allowed = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }],
      },
      select: { id: true },
    });

    if (!allowed) {
      return;
    }

    await this.leaveCurrentRoom(client);

    const room = `document:${documentId}`;
    await client.join(room);
    this.socketRooms.set(client.id, documentId);

    let roomSockets = this.sockets.get(documentId);
    if (!roomSockets) {
      roomSockets = new Map();
      this.sockets.set(documentId, roomSockets);
    }
    roomSockets.set(client.id, user);

    this.emitPresence(documentId);
  }

  @SubscribeMessage('leaveDocument')
  leaveDocument(@ConnectedSocket() client: Socket) {
    void this.leaveCurrentRoom(client);
  }

  private async leaveCurrentRoom(client: Socket) {
    const documentId = this.socketRooms.get(client.id);
    if (!documentId) {
      return;
    }

    this.socketRooms.delete(client.id);
    const roomSockets = this.sockets.get(documentId);
    roomSockets?.delete(client.id);
    if (roomSockets && roomSockets.size === 0) {
      this.sockets.delete(documentId);
    }

    await client.leave(`document:${documentId}`);
    this.emitPresence(documentId);
  }

  private emitPresence(documentId: string) {
    const roomSockets = this.sockets.get(documentId);
    const unique = new Map<string, PresenceUser>();
    roomSockets?.forEach((user) => {
      unique.set(user.id, user);
    });

    this.server.to(`document:${documentId}`).emit('presence', {
      users: [...unique.values()],
    });
  }
}
