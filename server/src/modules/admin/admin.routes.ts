import { Router } from 'express';
import * as adminCtrl from './admin.controller.js';
import { requireAuth, requireRole, validate } from '../../middleware/index.js';
import {
  createPlanSchema,
  updatePlanSchema,
  extendSubscriptionSchema,
  changePlanSchema,
  recordOfflinePaymentSchema,
  updatePlatformSettingsSchema,
} from '@cafe-qr/shared';

const router = Router();

// Strictly protected by super_admin role
router.use(requireAuth);
router.use(requireRole('super_admin'));

// Platform Overview
router.get('/overview', adminCtrl.getOverview);

// Cafes List & Actions
router.get('/cafes', adminCtrl.listCafes);
router.get('/cafes/:id', adminCtrl.getCafe);
router.post('/cafes/:id/suspend', adminCtrl.suspendCafe);
router.post('/cafes/:id/reactivate', adminCtrl.reactivateCafe);
router.post('/cafes/:id/impersonate', adminCtrl.impersonate);

// Fixed Table QR Generation & Management
router.get('/cafes/:id/tables', adminCtrl.getCafeTables);
router.post('/cafes/:id/tables/generate-qr', adminCtrl.generateCafeTableQR);
router.post('/cafes/:id/tables/bulk-generate-qr', adminCtrl.bulkGenerateCafeTableQRs);

// Subscriptions & Payments
router.post(
  '/subscriptions/:subscriptionId/extend',
  validate({ body: extendSubscriptionSchema }),
  adminCtrl.extendDays,
);
router.post(
  '/subscriptions/:subscriptionId/change-plan',
  validate({ body: changePlanSchema }),
  adminCtrl.changePlan,
);
router.post(
  '/subscriptions/:subscriptionId/offline-payment',
  validate({ body: recordOfflinePaymentSchema }),
  adminCtrl.recordOfflinePayment,
);

// Plans CRUD
router.get('/plans', adminCtrl.listPlans);
router.post('/plans', validate({ body: createPlanSchema }), adminCtrl.createPlan);
router.put('/plans/:id', validate({ body: updatePlanSchema }), adminCtrl.updatePlan);
router.delete('/plans/:id', adminCtrl.archivePlan);

// Platform Settings
router.get('/settings', adminCtrl.getSettings);
router.put('/settings', validate({ body: updatePlatformSettingsSchema }), adminCtrl.updateSettings);

// Audit Logs
router.get('/audit-logs', adminCtrl.getAuditLogs);

export default router;
