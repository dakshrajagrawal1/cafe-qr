import { Router } from 'express';
import * as cafeCtrl from './cafe.controller.js';
import {
  requireAuth,
  requireRole,
  requirePermission,
  injectCafeId,
  requireCafeContext,
  validate,
  uploadDocument,
} from '../../middleware/index.js';
import {
  updateCafeProfileSchema,
  updateCafeSettingsSchema,
} from '@cafe-qr/shared';

const router = Router();

router.use(requireAuth);
router.use(injectCafeId);
router.use(requireCafeContext);

router.get('/profile', requireRole('owner', 'manager'), cafeCtrl.getProfile);
router.put(
  '/profile',
  requireRole('owner'),
  validate({ body: updateCafeProfileSchema }),
  cafeCtrl.updateProfile,
);

router.get('/settings', requireRole('owner', 'manager'), cafeCtrl.getSettings);
router.put(
  '/settings',
  requireRole('owner', 'manager'),
  requirePermission('can_manage_settings'),
  validate({ body: updateCafeSettingsSchema }),
  cafeCtrl.updateSettings,
);
router.patch(
  '/settings',
  requireRole('owner', 'manager'),
  requirePermission('can_manage_settings'),
  validate({ body: updateCafeSettingsSchema }),
  cafeCtrl.updateSettings,
);

router.get('/documents', requireRole('owner'), cafeCtrl.getDocuments);
router.post('/documents', requireRole('owner'), uploadDocument, cafeCtrl.uploadDocument);

export default router;

