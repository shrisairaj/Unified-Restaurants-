import crypto from 'crypto';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import customerRepo from '../repositories/customer.repository.js';
import orderService from '../services/order.service.js';
import razorpayService from '../services/razorpay.service.js';
import { CustomError, STATUS_CODE, calculateBill } from '../utils/common.js';

const createOrder = async (req, res) => {
    try {
        const { hotelId, customerId, tableId, tableNumber, menus, tipAmount = 0 } = req.body;
        if (!hotelId || !customerId || !tableId || !tableNumber || !menus || !menus.length) {
            throw CustomError(STATUS_CODE.BAD_REQUEST, 'Missing required fields');
        }

        const subtotal = menus.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const { sgst, cgst, totalPrice } = calculateBill(subtotal, tipAmount);

        // Razorpay order creation
        const amount = totalPrice * 100; // in paise
        logger('info', `Creating Razorpay payment order for customer ${customerId} of amount ${amount} paise`);
        const rzpOrder = await razorpayService.order({
            amount,
            currency: 'INR',
            receipt: `cust_pay_${Date.now()}`
        });

        const customer = await customerRepo.findOne({ where: { id: customerId } });
        if (!customer) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Customer not found');
        }

        return res.status(STATUS_CODE.OK).json({
            success: true,
            orderId: rzpOrder.id,
            amount: rzpOrder.amount,
            key: env.razorpay.keyId,
            totalPrice,
            tipAmount: Number(tipAmount) || 0,
            menus,
            customer: {
                name: customer.name,
                email: customer.email,
                phoneNumber: customer.phoneNumber
            }
        });
    } catch (error) {
        logger('error', 'Error creating customer payment order', { error: error.message });
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).json({ message: error.message });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature,
            hotelId,
            customerId,
            tableId,
            tableNumber,
            menus,
            tipAmount = 0
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !hotelId || !customerId || !tableId || !tableNumber || !menus) {
            throw CustomError(STATUS_CODE.BAD_REQUEST, 'Missing verification details');
        }

        const generated = crypto
            .createHmac('sha256', env.razorpay.keySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (generated !== razorpaySignature) {
            throw CustomError(STATUS_CODE.FORBIDDEN, 'Invalid signature');
        }

        // Place actual food order
        logger('info', `Payment verified. Placing food order for customer ${customerId}`);
        const result = await orderService.placeOrder({
            customerId,
            menus,
            hotelId,
            tableId,
            tableNumber,
            tipAmount,
            razorpayOrderId,
            razorpayPaymentId
        });

        return res.status(STATUS_CODE.CREATED).json(result);
    } catch (error) {
        logger('error', 'Error verifying customer payment', { error: error.message });
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).json({ message: error.message });
    }
};

export default {
    createOrder,
    verifyPayment
};
