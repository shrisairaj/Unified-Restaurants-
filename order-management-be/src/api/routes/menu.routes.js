import { Router } from 'express';
import menuController from '../controllers/menu.controller.js';
import authenticate from '../middlewares/auth.js';
import checkSubscriptionAccess from '../middlewares/subscription.js';

const router = Router();

router.route('/category').all(authenticate, checkSubscriptionAccess).post(menuController.createCategory).delete(menuController.removeCategory);
router.get('/category/:hotelId', authenticate, checkSubscriptionAccess, menuController.fetchCategory);
router.put('/category/:id', authenticate, checkSubscriptionAccess, menuController.updateCategory);

router.route('/').all(authenticate, checkSubscriptionAccess).post(menuController.create).delete(menuController.remove);
router.route('/:id').all(authenticate, checkSubscriptionAccess).put(menuController.update).get(menuController.fetch);

export default router;
