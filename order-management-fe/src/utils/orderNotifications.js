import React from 'react';
import { toast } from 'react-toastify';
import { NOTIFICATION_ACTIONS } from './constants';

export const showNewOrderToast = (meta) => {
    if (!meta?.orderNumber || meta?.tableNumber === undefined) {
        return;
    }

    const orderAmount = meta?.totalAmount ? `₹${meta.totalAmount}` : 'N/A';

    toast.info(
        <div>
            <strong>New Order Received</strong>
            <p style={{ marginBottom: '0.25rem' }}>Order Number: {meta.orderNumber}</p>
            <p style={{ marginBottom: '0.25rem' }}>Table: {meta.tableNumber}</p>
            <p style={{ marginBottom: 0 }}>Amount: {orderAmount}</p>
        </div>,
        {
            position: 'top-right',
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
        }
    );
};

export const handleManagerServiceWorkerMessage = (event, callbacks = {}) => {
    const { meta, title, message } = event.data || {};
    const { showToast = true } = callbacks;

    switch (meta?.action) {
        case NOTIFICATION_ACTIONS.ORDER_PLACEMENT:
            if (showToast) {
                showNewOrderToast(meta);
            }
            callbacks.onOrderPlacement?.(meta);
            break;
        case NOTIFICATION_ACTIONS.CUSTOMER_REGISTERATION:
        case NOTIFICATION_ACTIONS.ONLINE_PAYMENT_CONFIRMED:
            callbacks.onOrdersRefresh?.(meta);
            break;
        case NOTIFICATION_ACTIONS.PAYMENT_REQUEST:
            callbacks.onPaymentRequest?.(meta, { title, message });
            break;
        default:
            if (title && message) {
                toast.info(`${title}\n${message}`, {
                    position: 'top-right',
                    autoClose: 7000
                });
            }
            break;
    }
};
