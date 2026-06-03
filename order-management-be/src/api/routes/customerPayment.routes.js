import { Router } from 'express';
import customerPaymentController from '../controllers/customerPayment.controller.js';

const router = Router();

router.post('/create-order', customerPaymentController.createOrder);
router.post('/verify', customerPaymentController.verifyPayment);

export default router;
