import { Router } from 'express';
import * as dayCtrl from './business-day.controller.js';
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

// Manager and Owner can manage business day start/end
router.use(requireRole('owner', 'manager'));

router.get('/current', dayCtrl.getCurrent);
router.post('/start', dayCtrl.startDay);
router.post('/end', dayCtrl.endDay);

export default router;
