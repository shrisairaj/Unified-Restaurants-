export * from './auth.slice';
export * from './manager.slice';
export * from './hotel.slice';
export * from './invite.slice';
export * from './app.slice';
export * from './menu.slice';
export * from './table.slice';
export {
    setCurrentPage,
    getTableDetailsRequest,
    getTableDetailsSuccess,
    registerCustomerRequest,
    getMenuDetailsRequest,
    getMenuDetailsSuccess,
    setOrderDetails,
    placeOrderRequest,
    setViewOrderDetails,
    getCustomerOrderDetailsRequest,
    setUpdatedOrderDetails,
    payOrderRequest,
    setOrderPaymentData,
    customerPaymentConfirmationRequest,
    setFeedback,
    sendFeedbackRequest,
    setFeedbackDetails,
    setInvoicePrompt,
    customerPrePaymentRequest,
    verifyCustomerPaymentRequest,
    setTrackingOrder,
    orderPlacementReducer
} from './orderPlacement.slice';
export * from './paymentActivation.slice';
export * from './checkout.slice';
export * from './orders.slice';
export * from './dashboard.slice';
export * from './revenue.slice';
