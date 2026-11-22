import { Router } from 'express';
import * as tableCtrl from './tables.controller.js';
import {
  requireAuth,
  requireRole,
  requirePermission,
  injectCafeId,
  requireCafeContext,
  validate,
  scanLimiter,
  enforcePlanLimit,
} from '../../middleware/index.js';
import { z } from 'zod';

const router = Router();

// Public table token verification (used when customer scans QR)
router.get('/verify', scanLimiter, tableCtrl.verifyToken);

// Protected staff routes
router.use(requireAuth);
router.use(injectCafeId);
router.use(requireCafeContext);
router.use(requireRole('owner', 'manager'));

const tableSchema = z.object({
  tableNumber: z.string().min(1).max(20),
  label: z.string().max(100).optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  sortOrder: z.number().int().default(0),
});

router.get('/live', tableCtrl.getLiveGrid);
router.post('/sessions/:sessionId/force-close', tableCtrl.forceCloseSession);
router.get('/', tableCtrl.list);
router.post(
  '/',
  requirePermission('can_manage_tables'),
  enforcePlanLimit('max_tables'),
  validate({ body: tableSchema }),
  tableCtrl.create,
);
router.put('/:id', requirePermission('can_manage_tables'), validate({ body: tableSchema.partial() }), tableCtrl.update);
router.delete('/:id', requirePermission('can_manage_tables'), tableCtrl.remove);
router.get('/:id/qr', tableCtrl.getQR);

export default router;
