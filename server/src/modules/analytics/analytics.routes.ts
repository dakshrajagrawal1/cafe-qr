import { Router } from 'express';
import * as analyticsCtrl from './analytics.controller.js';
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

// Owner only has access to financial analytics (Manager is restricted from revenue analytics)
router.use(requireRole('owner'));

router.get('/overview', analyticsCtrl.getOverview);

export default router;
