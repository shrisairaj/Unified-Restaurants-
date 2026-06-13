import { Router } from 'express';
import managerController from '../controllers/manager.controller.js';
import authenticate from '../middlewares/auth.js';
import { ownerAuthentication } from '../middlewares/roleAuth.js';
import checkSubscriptionAccess from '../middlewares/subscription.js';

const router = Router();

router.post('/', authenticate, checkSubscriptionAccess, ownerAuthentication, managerController.create);
router.get('/', authenticate, checkSubscriptionAccess, ownerAuthentication, managerController.fetch);
router.put('/:id', authenticate, checkSubscriptionAccess, ownerAuthentication, managerController.update);
router.patch('/:id/credentials', authenticate, checkSubscriptionAccess, ownerAuthentication, managerController.updateCredentials);
router.delete('/:id', authenticate, checkSubscriptionAccess, ownerAuthentication, managerController.remove);
router.get('/assignable', authenticate, checkSubscriptionAccess, ownerAuthentication, managerController.getAssignable);

export default router;
