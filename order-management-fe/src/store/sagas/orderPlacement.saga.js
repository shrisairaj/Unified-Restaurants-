import { toast } from 'react-toastify';
import { all, put, takeLatest } from 'redux-saga/effects';
import env from '../../config/env';
import * as checkoutService from '../../services/checkout.service';
import * as orderService from '../../services/order.service';
import * as service from '../../services/orderPlacement.service';
import {
    getMenuDetailsRequest,
    getMenuDetailsSuccess,
    getTableDetailsRequest,
    getTableDetailsSuccess,
    getTablesRequest,
    setFeedback,
    setFeedbackDetails,
    setInvoicePrompt,
    setOrderDetails,
    setOrderPaymentData,
    setPaymentRequest,
    setViewOrderDetails,
    setTrackingOrder
} from '../slice';
import {
    GET_MENU_DETAIL_REQUEST,
    GET_CUSTOMER_ORDER_DETAILS_REQUEST,
    GET_TABLE_DETAILS_REQUEST,
    PAY_CONFIRMATION_REQUEST,
    PAY_MANUAL_REQUEST,
    PLACE_ORDER_REQUEST,
    REGISTER_CUSTOMER_REQUEST,
    SEND_FEEDBACK_REQUEST,
    CUSTOMER_PRE_PAYMENT_REQUEST,
    VERIFY_CUSTOMER_PAYMENT_REQUEST
} from '../types';

function* getTablesDetailsRequestSaga(action) {
    try {
        const id = action.payload;
        const res = yield service.getTableDetail(id);

        yield put(getTableDetailsSuccess(res));
    } catch (error) {
        console.error('Failed to get table by id ', error);
        toast.error(`Failed to get table details ${error.message}`);
    }
}

function* registerCustomerRequestSaga(action) {
    try {
        const payload = action.payload;
        const localSubscription = {
            endpoint: 'https://localhost/local-dev-endpoint',
            keys: {
                p256dh: 'local-dev-p256dh',
                auth: 'local-dev-auth'
            }
        };

        if (env.notificationKey && navigator.serviceWorker) {
            try {
                const registration = yield navigator.serviceWorker.register('/serviceWorker.js');
                yield navigator.serviceWorker.ready;

                const subscription = yield registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: env.notificationKey
                });

                payload.subscription = subscription;
            } catch (notificationError) {
                console.warn('Notification subscription skipped:', notificationError);
                payload.subscription = localSubscription;
            }
        } else {
            payload.subscription = localSubscription;
        }

        yield service.registerCustomer(payload);
        yield put(getTableDetailsRequest(payload.tableId));
    } catch (error) {
        console.error('Failed to register customer', error);
        toast.error(`Failed to register customer ${error.message}`);
    }
}

function* getMenuDetailsRequestSaga(action) {
    try {
        const { hotelId, customerId } = action.payload;
        const res = yield service.getMenuDetails(hotelId, customerId);

        yield put(getMenuDetailsSuccess(res));
    } catch (error) {
        console.error('Failed to fetch menu card details', error);
        toast.error(`Failed to fetch menu card details ${error.message}`);
    }
}

function* placeOrderRequestSaga(action) {
    try {
        const payload = action.payload;

        const result = yield service.placeOrder(payload);
        yield put(setOrderDetails({}));
        yield put(setViewOrderDetails({}));

        localStorage.removeItem('orderId');
        localStorage.removeItem('customerId');
        sessionStorage.removeItem('orderId');
        sessionStorage.removeItem('customerId');

        yield put(getMenuDetailsRequest({ hotelId: payload.hotelId, customerId: payload.customerId }));
        if (result?.order?.items?.length) {
            yield put(setInvoicePrompt(result));
        }
        toast.success('Order received! Your delicious meal is on the way. Thank you for your patience!');
    } catch (error) {
        console.error('Failed to place order', error);
        toast.error(`Failed to fetch menu card details ${error.message}`);
    }
}

function* getOrderDetailsRequestSaga(action) {
    try {
        const customerId = action.payload;
        const res = yield service.getOrder(customerId);

        if (!res.count) {
            toast.warn(`Looks like you haven't ordered anything yet. Explore our menu and treat yourself.`);
        } else {
            yield put(setViewOrderDetails(res));
        }
    } catch (error) {
        console.error('Failed to fetch order details', error);
        toast.error(`Failed to fetch order details ${error.message}`);
    }
}

function* paymentOrderRequestSaga(action) {
    try {
        const payload = action.payload;
        const res = yield checkoutService.paymentRequest(payload);

        if (payload.manual) {
            toast.info(`Please pay manually and wait until your request is approved`);
        } else {
            yield put(setOrderPaymentData(res));
        }
    } catch (error) {
        console.error('Failed to process payment request', error);
        toast.error(`Failed to process payment request ${error.message}`);
    }
}

function* paymentConfirmationRequestSaga(action) {
    try {
        const { hotelId, ...payload } = action.payload;

        yield checkoutService.paymentConfirmation(payload);

        if (!payload.manual) {
            toast.info(`🥂 Payment confirmed, thank you for choosing us! 🌟 Your feedback means the world to us.`);
            yield put(setViewOrderDetails({}));
            yield put(setFeedback(true));
        } else {
            toast.success(`Payment confirmed successfully`);
            yield put(setPaymentRequest(false));
            yield put(getTablesRequest({ hotelId, location: 'orders', active: true }));
        }
    } catch (error) {
        console.error('Failed to process payment request', error);
        toast.error(`Failed to confirm payment ${error.message}`);
    }
}

function* sendFeedbackRequestSaga(action) {
    try {
        const { tableId, ...payload } = action.payload;

        yield orderService.feedback(payload);
        toast.success(`Thank you for your feedback! We appreciate your time and input.`);
        yield put(setFeedbackDetails({}));
        yield put(setFeedback(false));
        if (tableId) {
            yield put(getTableDetailsRequest(tableId));
        }
    } catch (error) {
        console.error('Failed to process feedback request', error);
        toast.error(`Failed to submit feedback ${error.message}`);
    }
}

function* customerPrePaymentRequestSaga(action) {
    try {
        const payload = action.payload;
        const res = yield service.createCustomerPaymentOrder(payload);
        const paymentData = {
            email: res.customer.email,
            name: res.customer.name,
            phoneNumber: res.customer.phoneNumber,
            orderId: res.orderId,
            amount: res.amount,
            keyId: res.key,
            isPrePayment: true,
            menus: res.menus,
            tipAmount: Number(res.tipAmount) || Number(payload.tipAmount) || 0
        };
        yield put(setOrderPaymentData(paymentData));
    } catch (error) {
        console.error('Failed to create customer payment order', error);
        toast.error(`Failed to create payment: ${error.message}`);
    }
}

function* verifyCustomerPaymentRequestSaga(action) {
    try {
        const payload = action.payload;
        const result = yield service.verifyCustomerPayment(payload);
        yield put(setOrderDetails({}));
        yield put(setViewOrderDetails({}));
        yield put(setOrderPaymentData(false));
        const orderData = result?.order || result;
        yield put(setTrackingOrder(orderData));

        const activeOrder = {
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            tableNumber: orderData.tableNumber || payload.tableNumber,
            totalPrice: orderData.totalPrice,
            orderStatus: orderData.orderStatus,
            orderDateTime: orderData.orderDateTime,
            hotelId: orderData.hotelId || payload.hotelId,
            tableId: orderData.tableId || payload.tableId,
            customerId: payload.customerId
        };
        localStorage.setItem('activeOrder', JSON.stringify(activeOrder));

        toast.success('Payment successful! Order received! Your delicious meal is on the way.');

        if (payload.navigate) {
            payload.navigate(`/track-order/${orderData.orderId}`, { replace: true });
        }
    } catch (error) {
        console.error('Failed to verify customer payment', error);
        toast.error(`Failed to verify payment: ${error.message}`);
    }
}

export default function* orderPlacementSaga() {
    yield all([
        takeLatest(GET_TABLE_DETAILS_REQUEST, getTablesDetailsRequestSaga),
        takeLatest(REGISTER_CUSTOMER_REQUEST, registerCustomerRequestSaga),
        takeLatest(GET_MENU_DETAIL_REQUEST, getMenuDetailsRequestSaga),
        takeLatest(PLACE_ORDER_REQUEST, placeOrderRequestSaga),
        takeLatest(GET_CUSTOMER_ORDER_DETAILS_REQUEST, getOrderDetailsRequestSaga),
        takeLatest(PAY_MANUAL_REQUEST, paymentOrderRequestSaga),
        takeLatest(PAY_CONFIRMATION_REQUEST, paymentConfirmationRequestSaga),
        takeLatest(SEND_FEEDBACK_REQUEST, sendFeedbackRequestSaga),
        takeLatest(CUSTOMER_PRE_PAYMENT_REQUEST, customerPrePaymentRequestSaga),
        takeLatest(VERIFY_CUSTOMER_PAYMENT_REQUEST, verifyCustomerPaymentRequestSaga)
    ]);
}
