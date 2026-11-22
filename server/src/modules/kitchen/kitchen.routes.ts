import { Router } from 'express';
import * as kitchenCtrl from './kitchen.controller.js';
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

// Owner, manager, and chef roles can access the kitchen screen
router.use(requireRole('owner', 'manager', 'chef'));

router.get('/tickets', kitchenCtrl.getTickets);
router.patch('/tickets/:ticketId/status', kitchenCtrl.updateStatus);
router.post('/tickets/:ticketId/undo', kitchenCtrl.undoStatus);

export default router;
