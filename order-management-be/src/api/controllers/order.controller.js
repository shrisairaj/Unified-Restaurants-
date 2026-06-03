import logger from '../../config/logger.js';
import orderService from '../services/order.service.js';
import { STATUS_CODE } from '../utils/common.js';
import { resolveHotelAccess, resolveHotelAccessByTableId } from '../utils/hotelAccess.js';
import {
    customerRegistrationValidation,
    feedbackValidation,
    orderPlacementValidation
} from '../validations/order.validation.js';

const register = async (req, res) => {
    try {
        const { body } = req;
        logger('debug', `Registration of customer request ${JSON.stringify(body)}`);

        // Validating the registration data
        const validation = customerRegistrationValidation(body);
        if (validation.error) {
            logger('error', 'Registration validation error', { error: validation.error });
            return res.status(STATUS_CODE.BAD_REQUEST).send({ message: validation.error.message });
        }

        const result = await orderService.register(body);
        logger('info', 'Customer registration successful', { result });

        return res.status(STATUS_CODE.CREATED).send(result);
    } catch (error) {
        logger('error', 'Error occurred during customer registration', { error });
        return res.status(error.code).send({ message: error.message });
    }
};

const getTableDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await orderService.getTableDetails(id);
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error while fetching table by id ${error}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const getMenuDetails = async (req, res) => {
    try {
        const { hotelId, customerId } = req.query;
        logger('debug', `Fetching hotel details for cutomer ${hotelId}`);

        const result = await orderService.getMenuDetails(hotelId, customerId);
        logger('info', 'Hotel details fetched successfully', { result });

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during fetching hotel details ${JSON.stringify(error)}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const placeOrder = async (req, res) => {
    try {
        const payload = req.body;
        logger('debug', `Place order details`, payload);

        const valid = orderPlacementValidation(payload);
        if (valid.error) {
            logger('error', `Order placement validation failed`, valid.error);
            return res.status(STATUS_CODE.BAD_REQUEST).send({ message: valid.error.message });
        }

        const result = await orderService.placeOrder(payload);
        logger('info', 'Order placed successfully', { result });

        return res.status(STATUS_CODE.CREATED).send(result);
    } catch (error) {
        logger('error', `Error occurred during placing order ${JSON.stringify(error)}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const getOrder = async (req, res) => {
    try {
        const { customerId } = req.params;
        logger('debug', `Get order details for customer ${customerId}`);

        const result = await orderService.getOrder(customerId);
        logger('debug', `Get order details response`, result);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during fetching order ${JSON.stringify(error)}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const feedback = async (req, res) => {
    try {
        const payload = req.body;
        logger('debug', `Request for feedback for customer`, payload);

        const valid = feedbackValidation(payload);
        if (valid.error) {
            logger('error', `Feedback validation failed`, valid.error);
            return res.status(STATUS_CODE.BAD_REQUEST).send({ message: valid.error.message });
        }

        const result = await orderService.feedback(payload);
        logger('debug', `Order feedback response`, result);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during feedback ${JSON.stringify(error)}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const active = async (req, res) => {
    try {
        const { tableId } = req.params;
        await resolveHotelAccessByTableId(req.user, tableId);
        logger('debug', `Request for fetching active orders for ${tableId}`);

        const result = await orderService.active(tableId);
        logger('debug', `Active orders response`, result);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during fetching active orders ${JSON.stringify(error)}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const updatePending = async (req, res) => {
    try {
        const { orders, customerId, tableId } = req.body;
        if (tableId) {
            await resolveHotelAccessByTableId(req.user, tableId);
        }
        logger('debug', `Request for updating pending orders`, orders);

        const result = await orderService.updatePending(orders, customerId);
        logger('debug', `Updated orders successfully`, orders);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during updating pending orders ${JSON.stringify(error)}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const completed = async (req, res) => {
    try {
        const hotelId = await resolveHotelAccess(req.user, req.params.hotelId);
        logger('debug', `Request for fetching completed orders ${hotelId}`);

        const filters = req.query;
        const result = await orderService.completed(hotelId, filters);
        logger('debug', `Completed orders fetched successfully`, result);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during fetching completed orders ${JSON.stringify(error)}`);
        return res.status(error.code).send({ message: error.message });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const hotelId = await resolveHotelAccess(req.user, req.params.hotelId);
        const { orderId } = req.params;
        logger('debug', `Request for fetching order details - hotelId: ${hotelId}, orderId: ${orderId}`);

        const result = await orderService.getOrderDetails(hotelId, orderId);
        logger('debug', `Order details fetched successfully`);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during fetching order details ${JSON.stringify(error)}`);
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const hotelId = await resolveHotelAccess(req.user, req.params.hotelId);
        const { orderId, status } = req.body;

        if (!orderId || !status) {
            logger('error', `Missing required fields - orderId: ${orderId}, status: ${status}`);
            return res.status(STATUS_CODE.BAD_REQUEST).send({ message: 'orderId and status are required' });
        }

        logger('debug', `Request to update order status - hotelId: ${hotelId}, orderId: ${orderId}, status: ${status}`);

        const result = await orderService.updateOrderStatus(hotelId, orderId, status);
        logger('debug', `Order status updated successfully`);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during updating order status ${JSON.stringify(error)}`);
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: error.message });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const hotelId = await resolveHotelAccess(req.user, req.params.hotelId);
        const { orderId } = req.params;
        logger('debug', `Request to download invoice - hotelId: ${hotelId}, orderId: ${orderId}`);

        const result = await orderService.generateInvoice(hotelId, orderId);
        logger('debug', `Invoice generated successfully`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);
        return res.send(Buffer.from(result));
    } catch (error) {
        logger('error', `Error occurred during invoice download ${JSON.stringify(error)}`);
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: error.message });
    }
};

const getPublicOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        logger('debug', `Request for fetching public order details - orderId: ${orderId}`);

        const result = await orderService.getPublicOrderDetails(orderId);
        logger('debug', `Public order details fetched successfully`);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during fetching public order details ${JSON.stringify(error)}`);
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).send({ message: error.message });
    }
};

const getOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const result = await orderService.getOrderStatus(orderId);
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error occurred during fetching order status: ${error.message}`);
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).send({ message: error.message });
    }
};

const resetTable = async (req, res) => {
    try {
        const { tableId } = req.params;
        const result = await orderService.resetTable(tableId);
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error while resetting table ${error}`);
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).send({ message: error.message });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        logger('debug', `Request to cancel order - orderId: ${orderId}`);

        const result = await orderService.cancelOrder(orderId);
        logger('info', `Order ${orderId} cancelled successfully`);

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', `Error while cancelling order ${error}`);
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR || 500).send({ message: error.message });
    }
};

export default {
    register,
    getTableDetails,
    getMenuDetails,
    placeOrder,
    getOrder,
    feedback,
    active,
    updatePending,
    completed,
    getOrderDetails,
    updateOrderStatus,
    downloadInvoice,
    getOrderStatus,
    getPublicOrderDetails,
    resetTable,
    cancelOrder
};
