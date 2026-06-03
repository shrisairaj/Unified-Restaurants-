import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import env from '../../config/env';
import { setSubscriptionData, subscriptionSuccessRequest, setOrderPaymentData } from '../../store/slice';

const loadScript = (src) =>
    new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            console.error('error in loading razorpay');
            resolve(false);
        };
        document.body.appendChild(script);
    });

export const ACTIONS = {
    ORDERS: 'orders',
    SUBSCRIPTION: 'subscription'
};

function Razorpay({
    action,
    name,
    email,
    phoneNumber,
    subscriptionId = '',
    hotelName = '',
    amount = 0,
    orderId = '',
    keyId = '',
    handleSuccess = () => {}
}) {
    const paymentId = useRef(null);
    const paymentMethod = useRef(null);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    // To load razorpay checkout modal script.
    const displayRazorpay = async (options) => {
        const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

        if (!res) {
            toast.error('Razorpay SDK failed to load. Are you online ?');
            return;
        }
        // All information is loaded in options which we will discuss later.
        const rzp1 = new window.Razorpay(options);

        // If you want to retreive the chosen payment method.
        rzp1.on('payment.submit', (response) => {
            paymentMethod.current = response.method;
        });

        // To get payment id in case of failed transaction.
        rzp1.on('payment.failed', (response) => {
            console.log('PAYMENT FAILED', response);
            paymentId.current = response.error.metadata.payment_id;
        });

        // to open razorpay checkout modal.
        rzp1.open();
    };

    const onSuccess = (response) => {
        console.log('PAYMENT SUCCESS RESPONSE', response);
        const razorpayPaymentId = response.razorpay_payment_id;
        const razorpaySignature = response.razorpay_signature;

        if (action === ACTIONS.SUBSCRIPTION) {
            dispatch(subscriptionSuccessRequest({ subscriptionId, paymentId: razorpayPaymentId, navigate }));
        }

        if (action === ACTIONS.ORDERS) {
            handleSuccess({ orderId, paymentId: razorpayPaymentId, razorpaySignature });
        }
    };

    const handleDismiss = async (reason) => {
        if (action === ACTIONS.ORDERS) {
            if (reason === undefined) {
                toast.error('Cancelled the payment. Please try again.');
            } else if (reason === 'timeout') {
                toast.error('Payment timed out! Please try again.');
            } else {
                toast.error('Payment failed. Please try again.');
            }
            dispatch(setOrderPaymentData(false));
        } else {
            if (reason === undefined) {
                toast.error('Cancelled the payment. Please refresh and try re-subscribing');
            } else if (reason === 'timeout') {
                toast.error('Payment timedout! Please refresh and try re-subscribing');
            } else {
                toast.error('Payment failed. Please refresh and try re-subscribing');
            }
            dispatch(setSubscriptionData(false));
        }
    };

    useEffect(() => {
        console.log('RAZORPAY ORDER RESPONSE', { orderId, amount, keyId });
        let options = {
            key: keyId || env.razorpay.id,
            name: hotelName,
            image: '/rasops.png',
            theme: {
                color: '#08182d'
            },
            currency: 'INR',
            prefill: {
                name,
                email,
                contact: phoneNumber
            },
            handler: onSuccess,
            modal: {
                // eslint-disable-next-line camelcase
                confirm_close: true,
                ondismiss: handleDismiss
            },
            retry: {
                enabled: false
            },
            timeout: 300
        };

        if (action === ACTIONS.ORDERS) {
            options = {
                ...options,
                amount,
                // eslint-disable-next-line camelcase
                order_id: orderId
            };
        }

        if (action === ACTIONS.SUBSCRIPTION) {
            options = {
                ...options,
                // eslint-disable-next-line camelcase
                subscription_id: subscriptionId
            };
        }

        console.log('RAZORPAY OPTIONS', options);
        displayRazorpay(options);
    }, []);

    return null;
}

export default Razorpay;
