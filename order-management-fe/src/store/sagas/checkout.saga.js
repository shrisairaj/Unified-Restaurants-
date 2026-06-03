import { toast } from 'react-toastify';
import { all, put, takeLatest } from 'redux-saga/effects';
import * as authService from '../../services/auth.service';
import * as service from '../../services/checkout.service';
import * as subscriptionService from '../../services/subscription.service';
import {
    setConfirmation,
    setSubscriptionData,
    setSubscriptionOrder,
    getUserSuccess
} from '../slice';
import {
    CANCEL_SUBSCRIPTION_REQUEST,
    CREATE_SUBSCRIPTION_ORDER_REQUEST,
    SUBSCRIPTION_REQUEST,
    SUBSCRIPTION_SUCCESS_REQUEST,
    VERIFY_SUBSCRIPTION_PAYMENT_REQUEST
} from '../types';

function* subscriptionRequestSaga(action) {
    try {
        const { navigate, ...payload } = action.payload;
        const res = yield service.subscribe(payload);
        yield put(setConfirmation(false));

        if (payload.plan === 'CUSTOM') {
            toast.success(res.message);
            navigate('/hotels');
            return;
        }
        yield put(setSubscriptionData(res));
    } catch (error) {
        toast.error(`Failed to subcribe hotels ${error.message}`);
    }
}

function* subscriptionSuccessRequestSaga(action) {
    try {
        const { subscriptionId, paymentId } = action.payload;
        const navigate = action.payload.navigate;

        yield service.subscriptionSuccess({
            subscriptionId,
            paymentId
        });
        yield put(setSubscriptionData(false));
        toast.success('Subscribed successfully! Enjoy the services!');
        navigate('/hotels');
    } catch (error) {
        console.error(`Failed to update subscription success ${error.message}`);
    }
}

function* createSubscriptionOrderRequestSaga(action) {
    try {
        const { plan } = action.payload;
        const res = yield subscriptionService.createOrder({ plan });
        yield put(
            setSubscriptionOrder({
                ...res,
                orderId: res.order ? res.order.id : res.orderId,
                amount: res.order ? res.order.amount : res.amount,
                plan
            })
        );
    } catch (error) {
        toast.error(`Failed to create subscription order: ${error.message}`);
    }
}

function* verifySubscriptionPaymentRequestSaga(action) {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan, navigate } = action.payload;
        const payload = { plan };
        /* eslint-disable dot-notation */
        payload['razorpay_order_id'] = razorpayOrderId;
        payload['razorpay_payment_id'] = razorpayPaymentId;
        payload['razorpay_signature'] = razorpaySignature;
        /* eslint-enable dot-notation */
        yield subscriptionService.verifyPayment(payload);
        yield put(setSubscriptionOrder(null));
        const userRes = yield authService.getUser();
        yield put(getUserSuccess(userRes));
        toast.success('Subscription activated successfully!');
        if (navigate) navigate('/dashboard');
    } catch (error) {
        toast.error(`Failed to verify subscription payment: ${error.message}`);
    }
}

function* cancelSubscriptionRequestSaga(action) {
    const navigate = action.payload.navigate;
    try {
        const { subscriptionId } = action.payload;
        yield service.cancelSubscription({
            subscriptionId,
            cancelImmediately: true
        });
        toast.success('Subscription cancelled successfully!');
    } catch (error) {
        console.error(`Failed to cancel subscription ${error.message}`);
        toast.error('Failed to cancel subscription! Please try again');
    }
    navigate('/hotels');
}

export default function* checkoutSaga() {
    yield all([
        takeLatest(SUBSCRIPTION_REQUEST, subscriptionRequestSaga),
        takeLatest(SUBSCRIPTION_SUCCESS_REQUEST, subscriptionSuccessRequestSaga),
        takeLatest(CREATE_SUBSCRIPTION_ORDER_REQUEST, createSubscriptionOrderRequestSaga),
        takeLatest(VERIFY_SUBSCRIPTION_PAYMENT_REQUEST, verifySubscriptionPaymentRequestSaga),
        takeLatest(CANCEL_SUBSCRIPTION_REQUEST, cancelSubscriptionRequestSaga)
    ]);
}
