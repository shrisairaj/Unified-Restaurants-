import { Router } from 'express';
import orderController from '../controllers/order.controller.js';
import authenticate from '../middlewares/auth.js';
import checkSubscriptionAccess from '../middlewares/subscription.js';

const router = Router();

router.post('/', orderController.placeOrder);
router.post('/customer', orderController.register);
router.put('/pending', authenticate, checkSubscriptionAccess, orderController.updatePending);
router.get('/menu', orderController.getMenuDetails);
router.post('/feedback', orderController.feedback);
router.get('/table/:id', orderController.getTableDetails);
router.post('/table/:tableId/reset', orderController.resetTable);
router.get('/details/:hotelId/:orderId', authenticate, checkSubscriptionAccess, orderController.getOrderDetails);
router.put('/status/:hotelId', authenticate, checkSubscriptionAccess, orderController.updateOrderStatus);
router.patch('/:orderId/cancel', orderController.cancelOrder);
router.get('/completed/:hotelId', authenticate, checkSubscriptionAccess, orderController.completed);
router.get('/active/:tableId', authenticate, checkSubscriptionAccess, orderController.active);
router.get('/:orderId/status', orderController.getOrderStatus);
router.get('/:orderId/details', orderController.getPublicOrderDetails);
router.get('/:customerId', orderController.getOrder);
router.get('/invoice/:hotelId/:orderId', authenticate, checkSubscriptionAccess, orderController.downloadInvoice);

export default router;
