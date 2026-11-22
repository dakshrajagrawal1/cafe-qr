import { Router } from 'express';
import * as uploadCtrl from './upload.controller.js';
import { requireAuth, uploadImage } from '../../middleware/index.js';

const router = Router();

router.use(requireAuth);

router.post('/image', uploadImage, uploadCtrl.uploadSingleImage);

export default router;

