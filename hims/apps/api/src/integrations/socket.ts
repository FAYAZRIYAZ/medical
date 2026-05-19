import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@hims/shared';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling
  const pubClient = createClient({ url: env.REDIS_URL });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter connected');
    })
    .catch((err) => logger.error('Socket.IO Redis adapter error', { error: String(err) }));

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined
      ?? socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data['userId'] = payload.userId;
      socket.data['tenantId'] = payload.tenantId;
      socket.data['role'] = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const tenantId = socket.data['tenantId'] as string;
    const userId = socket.data['userId'] as string;
    const role = socket.data['role'] as string;

    logger.debug('Socket connected', { userId, tenantId, role });

    // Join tenant room
    void socket.join(`tenant:${tenantId}`);
    // Join user room
    void socket.join(`user:${userId}`);
    // Join role room
    void socket.join(`role:${tenantId}:${role}`);

    socket.on('join:room', (roomId: string) => {
      void socket.join(roomId);
    });

    socket.on('leave:room', (roomId: string) => {
      void socket.leave(roomId);
    });

    socket.on('chat:message', (data: { roomId: string; message: string }) => {
      io.to(data.roomId).emit('chat:message', {
        ...data,
        from: userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('chat:typing', (data: { roomId: string; typing: boolean }) => {
      socket.to(data.roomId).emit('chat:typing', { userId, typing: data.typing });
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId });
    });
  });

  return io;
}

class SocketService {
  emitToUser(userId: string, event: string, data: unknown): void {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
  }

  emitToTenant(tenantId: string, event: string, data: unknown): void {
    if (!io) return;
    io.to(`tenant:${tenantId}`).emit(event, data);
  }

  emitToRole(tenantId: string, role: string, event: string, data: unknown): void {
    if (!io) return;
    io.to(`role:${tenantId}:${role}`).emit(event, data);
  }

  emitToRoom(roomId: string, event: string, data: unknown): void {
    if (!io) return;
    io.to(roomId).emit(event, data);
  }
}

export const socketService = new SocketService();
