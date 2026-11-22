import { Router } from 'express';
import * as waiterCtrl from './waiter.controller.js';
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

// Owner, manager, and waiter roles can access waiter operations
router.use(requireRole('owner', 'manager', 'waiter'));

router.get('/tables', waiterCtrl.getTables);
router.get('/tables/:tableId/dishes', waiterCtrl.getTableDishes);
router.patch('/dishes/:dishId/serve', waiterCtrl.markServed);
router.post('/dishes/:dishId/undo-serve', waiterCtrl.undoServed);
router.get('/calls', waiterCtrl.getCalls);
router.patch('/calls/:callId/acknowledge', waiterCtrl.acknowledgeCall);
router.patch('/calls/:callId/resolve', waiterCtrl.resolveCall);
router.post('/orders', waiterCtrl.createOrder);

export default router;
