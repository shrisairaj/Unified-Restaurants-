import { Router } from 'express';
import tableController from '../controllers/table.controller.js';
import authenticate from '../middlewares/auth.js';
import checkSubscriptionAccess from '../middlewares/subscription.js';

const router = Router();

router
    .route('/:hotelId')
    .all(authenticate, checkSubscriptionAccess)
    .get(tableController.fetch)
    .post(tableController.create)
    .delete(tableController.remove);

export default router;
