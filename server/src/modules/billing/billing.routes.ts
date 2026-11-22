import { Router } from 'express';
import * as billingCtrl from './billing.controller.js';
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

// Manager and Owner can issue and settle bills
router.use(requireRole('owner', 'manager'));

router.get('/sessions/:sessionId/preview', billingCtrl.getPreview);
router.post('/sessions/:sessionId/bill', billingCtrl.createBill);
router.post('/bills/:billId/settle', billingCtrl.settle);

export default router;
