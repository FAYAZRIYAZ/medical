import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const roomService = env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET && env.LIVEKIT_URL
  ? new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET)
  : null;

export async function createLiveKitRoom(roomName: string): Promise<void> {
  if (!roomService) {
    logger.warn('[LiveKit STUB] Would create room', { roomName });
    return;
  }
  try {
    await roomService.createRoom({ name: roomName, emptyTimeout: 600, maxParticipants: 10 });
    logger.info('LiveKit room created', { roomName });
  } catch (err) {
    logger.error('LiveKit room creation failed', { error: String(err) });
  }
}

export async function generateLiveKitToken(roomName: string, participantIdentity: string, participantName: string, isDoctor: boolean): Promise<string> {
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return 'stub-token';
  }

  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    ttl: '2h',
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isDoctor,
    roomRecord: isDoctor,
  });

  return token.toJwt();
}

export async function deleteRoom(roomName: string): Promise<void> {
  if (!roomService) return;
  try {
    await roomService.deleteRoom(roomName);
  } catch {
    // Room may already be deleted
  }
}
