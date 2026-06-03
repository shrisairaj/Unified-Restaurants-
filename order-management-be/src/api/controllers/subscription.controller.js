import crypto from 'crypto';
import moment from 'moment';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import userRepo from '../repositories/user.repository.js';
import razorpayService from '../services/razorpay.service.js';
import { CustomError, STATUS_CODE } from '../utils/common.js';

const PLANS = {
    MONTHLY: { days: 30, amount: 1000 },
    HALF_YEARLY: { days: 180, amount: 5500 },
    SIX_MONTHS: { days: 180, amount: 5500 },
    YEARLY: { days: 365, amount: 11000 }
};

const createOrder = async (req, res) => {
    console.log('CREATE ORDER API HIT');
    console.log('BODY =>', req.body);
    console.log('USER =>', req.user);
    console.log('KEY =>', process.env.RAZORPAY_KEY_ID);
    console.log('SECRET =>', process.env.RAZORPAY_SECRET);
    try {
        const { plan } = req.body;
        console.log('PLAN =>', plan);
        if (!plan || !PLANS[plan]) {
            throw CustomError(STATUS_CODE.BAD_REQUEST, 'Invalid plan');
        }

        const amount = PLANS[plan].amount * 100; // paise
        console.log('AMOUNT =>', amount);

        console.log('CREATING RAZORPAY INSTANCE');
        const data = {
            amount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpayService.order(data);
        console.log('ORDER =>', order);

        return res.status(200).send({
            success: true,
            order,
            orderId: order.id,
            amount: data.amount,
            key: env.razorpay.keyId
        });
    } catch (error) {
        console.error('RAZORPAY CREATE ORDER ERROR =>', error);
        console.error('STACK =>', error?.stack);
        return res.status(500).json({
            success: false,
            message: error.message,
            error
        });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature, plan } = req.body;
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !plan) {
            throw CustomError(STATUS_CODE.BAD_REQUEST, 'Missing required fields');
        }

        const generated = crypto
            .createHmac('sha256', env.razorpay.keySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (generated !== razorpaySignature) {
            throw CustomError(STATUS_CODE.FORBIDDEN, 'Invalid signature');
        }

        // Activate subscription for user
        const user = await userRepo.findOne({ where: { id: req.user.id } });
        if (!user) throw CustomError(STATUS_CODE.NOT_FOUND, 'User not found');

        const now = moment();
        const planInfo = PLANS[plan];
        if (!planInfo) throw CustomError(STATUS_CODE.BAD_REQUEST, 'Invalid plan selected');

        let start;
        let end;
        if (user.subscriptionEndAt && moment(user.subscriptionEndAt).isAfter(now)) {
            start = user.subscriptionStartAt || now.toISOString();
            end = moment(user.subscriptionEndAt).add(planInfo.days, 'days').toISOString();
        } else {
            start = now.toISOString();
            end = moment(now).add(planInfo.days, 'days').toISOString();
        }

        await userRepo.update({ where: { id: req.user.id } }, {
            subscriptionStartAt: start,
            subscriptionEndAt: end,
            subscriptionStatus: 'ACTIVE',
            subscriptionPlan: plan,
            razorpayOrderId,
            razorpayPaymentId
        });

        const updatedUser = await userRepo.findOne({ where: { id: req.user.id } });
        console.log('UPDATED USER =>', {
            subscriptionStatus: updatedUser.subscriptionStatus,
            subscriptionStartAt: updatedUser.subscriptionStartAt,
            subscriptionEndAt: updatedUser.subscriptionEndAt,
        });

        return res.status(200).send({
            success: true,
            message: 'Subscription activated',
            data: {
                subscriptionStatus: 'ACTIVE',
                subscriptionEndAt: end
            }
        });
    } catch (error) {
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).send({ message: error.message });
    }
};

const status = async (req, res) => {
    try {
        const user = await userRepo.findOne({ where: { id: req.user.id } });
        if (!user) throw CustomError(STATUS_CODE.NOT_FOUND, 'User not found');

        const now = moment();
        let statusValue = user.subscriptionStatus;
        if (!statusValue) {
            statusValue = 'TRIAL';
            try {
                await userRepo.update({ where: { id: req.user.id } }, { subscriptionStatus: 'TRIAL' });
            } catch (e) {
                logger('error', 'Error updating null subscriptionStatus to TRIAL', { e });
            }
        }

        let trialStart = user.trialStartAt;
        let trialEnd = user.trialEndAt;
        if (!trialEnd && statusValue === 'TRIAL') {
            trialStart = now.toISOString();
            trialEnd = moment(now).add(2, 'minutes').toISOString();
            try {
                await userRepo.update({ where: { id: req.user.id } }, {
                    trialStartAt: trialStart,
                    trialEndAt: trialEnd
                });
            } catch (e) {
                logger('error', 'Error initializing trial fields in status controller', { e });
            }
        }

        let trialRemaining = null;
        let subscriptionRemaining = null;

        if (trialEnd) {
            const tEnd = moment(trialEnd);
            trialRemaining = tEnd.isAfter(now) ? tEnd.diff(now, 'seconds') : 0;
            if (tEnd.isBefore(now) && statusValue === 'TRIAL') {
                statusValue = 'EXPIRED';
                await userRepo.update({ where: { id: req.user.id } }, { subscriptionStatus: 'EXPIRED' });
            }
        }

        if (user.subscriptionEndAt) {
            const sEnd = moment(user.subscriptionEndAt);
            subscriptionRemaining = sEnd.isAfter(now) ? sEnd.diff(now, 'seconds') : 0;
            if (sEnd.isBefore(now) && statusValue === 'ACTIVE') {
                statusValue = 'EXPIRED';
                await userRepo.update({ where: { id: req.user.id } }, { subscriptionStatus: 'EXPIRED' });
            }
        }

        return res.status(200).send({
            status: statusValue,
            trialRemaining,
            subscriptionRemaining,
            plan: user.subscriptionPlan || null
        });
    } catch (error) {
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).send({ message: error.message });
    }
};

export default {
    createOrder,
    verifyPayment,
    status
};
