import { Router } from 'express';
import { processRazorpayWebhook } from '../subscription/subscription.service.js';
import { env } from '../../config/env.js';

const router = Router();

router.post('/razorpay', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: { message: 'Missing x-razorpay-signature header' } });
    }

    const secret = env.RAZORPAY_WEBHOOK_SECRET || 'dev-webhook-secret';
    const result = await processRazorpayWebhook(req.body, signature, secret);

    res.json({ status: 'ok', ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
