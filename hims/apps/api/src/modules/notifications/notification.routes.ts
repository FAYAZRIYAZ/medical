import { Router } from 'express';
import type { Request, Response } from 'express';
import { NotificationModel } from './notification.model.js';
import { authenticate } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', async (req: Request, res: Response) => {
  const { page = '1', limit = '20', unread } = req.query as Record<string, string>;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const filter: Record<string, unknown> = { tenantId: req.tenantId, userId: req.user!._id };
  if (unread === 'true') filter['isRead'] = false;

  const [total, notifications] = await Promise.all([
    NotificationModel.countDocuments(filter),
    NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
  ]);

  const unreadCount = await NotificationModel.countDocuments({ tenantId: req.tenantId, userId: req.user!._id, isRead: false });

  sendSuccess(res, notifications, 200, {
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 },
    unreadCount,
  });
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  await NotificationModel.findOneAndUpdate(
    { _id: req.params['id'], userId: req.user!._id, tenantId: req.tenantId },
    { isRead: true, readAt: new Date() }
  );
  sendSuccess(res, { message: 'Marked as read' });
});

router.patch('/read-all', async (req: Request, res: Response) => {
  await NotificationModel.updateMany(
    { userId: req.user!._id, tenantId: req.tenantId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  sendSuccess(res, { message: 'All notifications marked as read' });
});

export default router;
