import { Router } from 'express';
import hotelController from '../controllers/hotel.controller.js';
import authenticate from '../middlewares/auth.js';
import { ownerAuthentication } from '../middlewares/roleAuth.js';
import checkSubscriptionAccess from '../middlewares/subscription.js';

const router = Router();

router.put('/:id', authenticate, checkSubscriptionAccess, hotelController.update);
router.route('/').all(authenticate, checkSubscriptionAccess, ownerAuthentication).post(hotelController.register).get(hotelController.list);
router.delete('/:id', authenticate, checkSubscriptionAccess, ownerAuthentication, hotelController.remove);
router.get('/revenue', authenticate, checkSubscriptionAccess, ownerAuthentication, hotelController.revenue);
router.get('/dashboard/:hotelId', authenticate, checkSubscriptionAccess, hotelController.dashboard);

export default router;
