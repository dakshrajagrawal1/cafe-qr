import { Router } from 'express';
import * as staffCtrl from './staff.controller.js';
import {
  requireAuth,
  requireRole,
  requirePermission,
  injectCafeId,
  requireCafeContext,
  validate,
} from '../../middleware/index.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);
router.use(injectCafeId);
router.use(requireCafeContext);
router.use(requireRole('owner', 'manager'));

const createStaffSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  role: z.enum(['manager', 'chef', 'waiter']),
  waiterPin: z.string().max(10).optional(),
  permissions: z.record(z.boolean()).optional(),
});

router.get('/', staffCtrl.list);
router.post('/', requirePermission('can_manage_staff'), validate({ body: createStaffSchema }), staffCtrl.create);
router.put('/:id', requirePermission('can_manage_staff'), staffCtrl.update);
router.delete('/:id', requirePermission('can_manage_staff'), staffCtrl.remove);

export default router;

