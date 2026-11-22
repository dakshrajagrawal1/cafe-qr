import { Router } from 'express';
import * as offersCtrl from './offers.controller.js';
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

// Owner and Manager can manage offers
router.use(requireRole('owner', 'manager'));

router.get('/', offersCtrl.list);
router.post('/', offersCtrl.create);
router.patch('/:offerId', offersCtrl.update);
router.delete('/:offerId', offersCtrl.remove);

export default router;
