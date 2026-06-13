import { Router } from 'express';
import checkoutRoutes from './checkout.routes.js';
import customerPaymentRoutes from './customerPayment.routes.js';
import hotelRoutes from './hotel.routes.js';
import managerRoutes from './manager.routes.js';
import menuRoutes from './menu.routes.js';
import notificationRoutes from './notification.routes.js';
import orderRoutes from './order.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import tableRoutes from './tables.routes.js';
import userRoutes from './user.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();
router.use('/user', userRoutes);
router.use('/hotel', hotelRoutes);
router.use('/manager', managerRoutes);
router.use('/table', tableRoutes);
router.use('/menu', menuRoutes);
router.use('/order', orderRoutes);
router.use('/notification', notificationRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/customer-payment', customerPaymentRoutes);
router.use('/admin', adminRoutes);

export default router;
