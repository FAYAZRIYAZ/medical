import { Router } from 'express';
import type { Request, Response } from 'express';
import { ChatRoomModel, ChatMessageModel } from './chat.model.js';
import { authenticate } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { socketService } from '../../integrations/socket.js';
import { uploadAny } from '../../middleware/upload.js';
import { storageService } from '../../integrations/storage.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/rooms', async (req: Request, res: Response) => {
  const rooms = await ChatRoomModel.find({
    tenantId: req.tenantId,
    participants: req.user!._id,
    isActive: true,
  })
    .populate('participants', 'firstName lastName avatar role')
    .sort({ updatedAt: -1 })
    .lean();
  sendSuccess(res, rooms);
});

router.post('/rooms', async (req: Request, res: Response) => {
  const { participantId, type = 'direct', name } = req.body as { participantId?: string; type?: string; name?: string };

  if (type === 'direct' && participantId) {
    // Find or create direct room
    const existing = await ChatRoomModel.findOne({
      tenantId: req.tenantId,
      type: 'direct',
      participants: { $all: [req.user!._id.toString(), participantId] },
    }).lean();
    if (existing) { sendSuccess(res, existing); return; }
  }

  const room = await ChatRoomModel.create({
    tenantId: req.tenantId,
    type,
    name,
    participants: participantId ? [req.user!._id, participantId] : [req.user!._id],
  });
  sendSuccess(res, room.toObject(), 201);
});

router.get('/rooms/:roomId/messages', async (req: Request, res: Response) => {
  const { before, limit = '30' } = req.query as { before?: string; limit?: string };
  const room = await ChatRoomModel.findOne({ _id: req.params['roomId'], tenantId: req.tenantId, participants: req.user!._id }).lean();
  if (!room) throw new NotFoundError('Chat room');

  const filter: Record<string, unknown> = { tenantId: req.tenantId, roomId: req.params['roomId'], isDeleted: false };
  if (before) filter['createdAt'] = { $lt: new Date(before) };

  const messages = await ChatMessageModel.find(filter)
    .populate('senderId', 'firstName lastName avatar role')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  // Mark as read
  await ChatMessageModel.updateMany(
    { roomId: req.params['roomId'], 'readBy.userId': { $ne: req.user!._id }, senderId: { $ne: req.user!._id } },
    { $push: { readBy: { userId: req.user!._id, readAt: new Date() } } }
  );

  sendSuccess(res, messages.reverse());
});

router.post('/rooms/:roomId/messages', async (req: Request, res: Response) => {
  const room = await ChatRoomModel.findOne({ _id: req.params['roomId'], tenantId: req.tenantId, participants: req.user!._id }).lean();
  if (!room) throw new NotFoundError('Chat room');

  const { text, replyTo } = req.body as { text?: string; replyTo?: string };
  const message = await ChatMessageModel.create({
    tenantId: req.tenantId,
    roomId: req.params['roomId'],
    senderId: req.user!._id,
    text,
    replyTo,
  });

  await ChatRoomModel.findByIdAndUpdate(req.params['roomId'], {
    lastMessage: { text: text ?? '', senderId: req.user!._id, sentAt: new Date() },
  });

  const populated = await ChatMessageModel.findById(message._id)
    .populate('senderId', 'firstName lastName avatar role')
    .lean();

  // Emit to room participants
  socketService.emitToRoom(`chat:${req.params['roomId']!}`, 'chat:message', populated);

  sendSuccess(res, populated, 201);
});

router.post('/rooms/:roomId/files', uploadAny.single('file'), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file' } }); return; }

  const room = await ChatRoomModel.findOne({ _id: req.params['roomId'], tenantId: req.tenantId, participants: req.user!._id }).lean();
  if (!room) throw new NotFoundError('Chat room');

  const url = await storageService.upload(req.file.buffer, `chat/${req.params['roomId']}/${Date.now()}-${req.file.originalname}`, req.file.mimetype);

  const message = await ChatMessageModel.create({
    tenantId: req.tenantId,
    roomId: req.params['roomId'],
    senderId: req.user!._id,
    fileUrl: url,
    fileType: req.file.mimetype,
    fileName: req.file.originalname,
  });

  socketService.emitToRoom(`chat:${req.params['roomId']!}`, 'chat:message', message.toObject());
  sendSuccess(res, message.toObject(), 201);
});

export default router;
