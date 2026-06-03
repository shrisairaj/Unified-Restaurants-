export const STATUS_CODE = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    GONE: 410,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    TOO_MANY_REQUEST: 429,
    CONFLICT: 409
};

export const EMAIL_ACTIONS = {
    VERIFY_USER: 'verify-user',
    FORGOT_PASSWORD: 'forgot-password',
    INVITE_MANAGER: 'invite-manager',
    CUSTOM_SUBSCRIPTION: 'custom-subscription',
    INVOICE_EMAIL: 'invoice-email'
};

export const TABLES = {
    USERS: 'users',
    INVITE: 'invites',
    HOTEL: 'hotels',
    HOTEL_USER_RELATION: 'hotelUserRelations',
    TABLE: 'tables',
    CATEGORIES: 'categories',
    MENU: 'menus',
    PREFERENCES: 'preferences',
    CUSTOMER: 'customers',
    ORDER: 'orders',
    PUSH_SUBSCRIPTION: 'pushSubscriptions',
    NOTIFICATION: 'notifications',
    PAYMENT_GATEWAY_ENTITIES: 'paymentGatewayEntities',
    SUBSCRIPTION: 'subscriptions'
};

export const CustomError = (code = STATUS_CODE.INTERNAL_SERVER_ERROR, message = 'Something went wrong.') => {
    const error = new Error(message);
    error.code = code;
    return error;
};

const UNIQUE_FIELD_MESSAGES = {
    email: 'Email already registered',
    phoneNumber: 'Phone number already registered'
};

export const mapSequelizeError = (error) => {
    if (error?.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors?.[0]?.path;
        const message = UNIQUE_FIELD_MESSAGES[field] || 'A record with this value already exists';
        return CustomError(STATUS_CODE.CONFLICT, message);
    }

    if (error?.name === 'SequelizeValidationError') {
        const message = error.errors?.[0]?.message || error.message;
        return CustomError(STATUS_CODE.BAD_REQUEST, message);
    }

    const statusCode = Number.isInteger(error?.code) ? error.code : STATUS_CODE.INTERNAL_SERVER_ERROR;
    return CustomError(statusCode, error?.message || 'Something went wrong.');
};

export const isCustomError = (error) => Number.isInteger(error?.code);

export const PLANS = {
    STANDARD_MONTHLY: 'STANDARD-MONTHLY',
    STANDARD_YEARLY: 'STANDARD-YEARLY',
    CUSTOM: 'CUSTOM'
};

export const calculateBill = (price, tipAmount = 0) => {
    const sgst = Math.round(price * (2.5 / 100));
    const cgst = Math.round(price * (2.5 / 100));
    const tip = Number(tipAmount) || 0;
    const totalPrice = price + tip + sgst + cgst;

    return { sgst, cgst, tipAmount: tip, totalPrice };
};

export const NOTIFICATION_ACTIONS = {
    CUSTOMER_REGISTERATION: 'customer-registeration',
    ORDER_PLACEMENT: 'order-placement',
    ORDER_SERVED: 'order-served',
    PAYMENT_REQUEST: 'payment-request',
    MANUAL_PAYMENT_CONFIRMED: 'manual-payment-confirmed',
    ONLINE_PAYMENT_CONFIRMED: 'online-payment-confirmed'
};
