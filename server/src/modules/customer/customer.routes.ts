import { Router } from 'express';
import * as custCtrl from './customer.controller.js';
import { requireCustomerAuth, orderLimiter } from '../../middleware/index.js';

const router = Router();

// All customer ordering endpoints require customer auth (via verified phone OTP token)
router.use(requireCustomerAuth);

router.post('/session/init', custCtrl.initSession);
router.get('/cart', custCtrl.getCart);
router.post('/cart/item', custCtrl.addCartItem);
router.put('/cart/item/:cartItemId', custCtrl.updateCartItem);
router.delete('/cart/item/:cartItemId', custCtrl.removeCartItem);

router.post('/order', orderLimiter, custCtrl.placeOrder);
router.get('/orders', custCtrl.getOrders);

router.post('/waiter-call', custCtrl.callWaiter);
router.post('/bill/request', custCtrl.requestBill);

export default router;
