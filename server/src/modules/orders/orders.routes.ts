import { Router } from 'express';
import * as orderCtrl from './orders.controller.js';
import {
  requireAuth,
  requireRole,
  injectCafeId,
  requireCafeContext,
} from '../../middleware/index.js';

const router = Router();

router.use(requireAuth);
router.use(injectCafeId);
router.use(requireCafeContext);

// Owner and Manager can manage incoming orders
router.use(requireRole('owner', 'manager'));

router.get('/', orderCtrl.list);
router.post('/:orderId/approve', orderCtrl.approve);
router.post('/:orderId/reject', orderCtrl.reject);
router.post('/sessions/:sessionId/add-dish', orderCtrl.addDishToSession);

export default router;
