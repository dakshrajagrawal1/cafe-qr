import { Router } from 'express';
import * as realtimeCtrl from './realtime.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/index.js';

const router = Router();

// Allow authenticated staff OR customers (via optionalAuth)
router.get('/poll', optionalAuth, realtimeCtrl.poll);

export default router;

