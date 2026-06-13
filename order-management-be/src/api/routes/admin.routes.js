import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authenticate from '../middlewares/auth.js';
import { adminAuthentication } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/dashboard', authenticate, adminAuthentication, adminController.dashboard);
router.get('/owners', authenticate, adminAuthentication, adminController.owners);
router.get('/owners/:id', authenticate, adminAuthentication, adminController.ownerDetail);
router.get('/revenue', authenticate, adminAuthentication, adminController.revenue);

export default router;
