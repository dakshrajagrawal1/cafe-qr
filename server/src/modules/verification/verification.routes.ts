import { Router } from 'express';
import * as verifyCtrl from './verification.controller.js';
import { requireAuth, requireRole } from '../../middleware/index.js';

const router = Router();

router.use(requireAuth);

// Document stream endpoint (allowed for super_admin OR document cafe owner)
router.get('/document/:documentId', verifyCtrl.viewPrivateDocument);

// Super admin only routes
router.use(requireRole('super_admin'));

router.get('/queue', verifyCtrl.listQueue);
router.get('/:cafeId', verifyCtrl.getDetails);
router.post('/:cafeId/approve', verifyCtrl.approve);
router.post('/:cafeId/reject', verifyCtrl.reject);

export default router;

