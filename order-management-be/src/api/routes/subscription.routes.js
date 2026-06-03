import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller.js';
import authenticate from '../middlewares/auth.js';

const router = Router();

router.post('/create-order', authenticate, subscriptionController.createOrder);
router.post('/verify-payment', authenticate, subscriptionController.verifyPayment);
router.get('/status', authenticate, subscriptionController.status);

export default router;
