import { Router } from 'express';
import * as subCtrl from './subscription.controller.js';
import {
  requireAuth,
  requireRole,
  injectCafeId,
  requireCafeContext,
} from '../../middleware/index.js';

const router = Router();

router.use(requireAuth);

// Public/Staff plan catalog
router.get('/plans', subCtrl.getPlans);

// Cafe owner endpoints (STRICTLY OWNER ONLY: never manager)
router.use(injectCafeId);
router.use(requireCafeContext);
router.use(requireRole('owner', 'super_admin'));

router.get('/current', subCtrl.getCurrent);
router.get('/payments', subCtrl.getPayments);

export default router;
