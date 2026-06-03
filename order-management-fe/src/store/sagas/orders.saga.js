import { toast } from 'react-toastify';
import { all, put, takeLatest } from 'redux-saga/effects';
import * as service from '../../services/order.service';
import {
    getActiveOrderRequest,
    getActiveOrderSuccess,
    getCompletedOrdersSuccess,
    getCompletedOrdersRequest,
    getOrderDetailsSuccess,
    getOrderDetailsFailure,
    updateOrderStatusSuccess,
    updateOrderStatusFailure,
    paymentConfirmationSuccess,
    clearOrderDetails
} from '../slice';
import {
    GET_ACTIVE_ORDER_REQUEST,
    GET_COMPLETED_ORDER_REQUEST,
    UPDATE_PENDING_ORDER_REQUEST,
    GET_ORDER_DETAILS_REQUEST,
    UPDATE_ORDER_STATUS_REQUEST,
    PAYMENT_CONFIRMATION_REQUEST
} from '../types';

function* getActiveOrdersRequestSaga(action) {
    try {
        const tableId = action.payload;
        let result = yield service.getActiveOrders(tableId);
        result.description = (result.description || []).reverse();
        if ('message' in result) {
            result = {};
        }
        yield put(getActiveOrderSuccess(result));
    } catch (error) {
        console.error('Failed to get table active orders', error);
        toast.error(`Failed to get table active orders ${error.message}`);
    }
}

function* getCompletedOrdersRequestSaga(action) {
    try {
        const { hotelId, params } = action.payload;
        const result = yield service.getCompletedOrders({ hotelId, ...params });
        yield put(getCompletedOrdersSuccess(result));
    } catch (error) {
        console.error('Failed to get table completed orders', error);
        toast.error(`Failed to get table completed orders ${error.message}`);
    }
}

function* updatePendingOrdersRequestSaga(action) {
    try {
        const { orders, tableId, customerId } = action.payload;
        yield service.updatePendingOrders({ orders, customerId });
        yield put(getActiveOrderRequest(tableId));
    } catch (error) {
        console.error('Failed to update table orders', error);
        toast.error(`Failed to update table orders ${error.message}`);
    }
}

function* getOrderDetailsRequestSaga(action) {
    try {
        const { hotelId, orderId } = action.payload;
        const result = yield service.getOrderDetails(hotelId, orderId);
        yield put(getOrderDetailsSuccess(result));
    } catch (error) {
        console.error('Failed to get order details', error);
        toast.error(`Failed to get order details ${error.message}`);
        yield put(getOrderDetailsFailure(error.message));
    }
}

function* updateOrderStatusRequestSaga(action) {
    try {
        const { hotelId, orderId, status } = action.payload;
        yield service.updateOrderStatus(hotelId, orderId, status);
        yield put(updateOrderStatusSuccess());
        yield put(clearOrderDetails());
        toast.success(`Order marked as ${status}`);
        // Refresh the orders list
        yield put(getCompletedOrdersRequest({
            hotelId,
            params: {}
        }));
    } catch (error) {
        console.error('Failed to update order status', error);
        toast.error(`Failed to update order status ${error.message}`);
        yield put(updateOrderStatusFailure(error.message));
    }
}

function* paymentConfirmationRequestSaga(action) {
    try {
        yield put(paymentConfirmationSuccess());
        toast.success('Payment confirmed successfully');
    } catch (error) {
        console.error('Failed to confirm payment', error);
        toast.error(`Failed to confirm payment ${error.message}`);
    }
}

export default function* orderSaga() {
    yield all([takeLatest(GET_ACTIVE_ORDER_REQUEST, getActiveOrdersRequestSaga)]);
    yield all([takeLatest(GET_COMPLETED_ORDER_REQUEST, getCompletedOrdersRequestSaga)]);
    yield all([takeLatest(UPDATE_PENDING_ORDER_REQUEST, updatePendingOrdersRequestSaga)]);
    yield all([takeLatest(GET_ORDER_DETAILS_REQUEST, getOrderDetailsRequestSaga)]);
    yield all([takeLatest(UPDATE_ORDER_STATUS_REQUEST, updateOrderStatusRequestSaga)]);
    yield all([takeLatest(PAYMENT_CONFIRMATION_REQUEST, paymentConfirmationRequestSaga)]);
}
