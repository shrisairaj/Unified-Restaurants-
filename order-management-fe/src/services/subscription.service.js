import { api, method } from '../api/apiClient';

export const createOrder = async (payload) => {
    try {
        return await api(method.POST, '/subscription/create-order', payload);
    } catch (error) {
        console.error(`Error creating subscription order ${error}`);
        throw error;
    }
};

export const verifyPayment = async (payload) => {
    try {
        return await api(method.POST, '/subscription/verify-payment', payload);
    } catch (error) {
        console.error(`Error verifying subscription payment ${error}`);
        throw error;
    }
};

export const getStatus = async () => {
    try {
        return await api(method.GET, '/subscription/status');
    } catch (error) {
        console.error(`Error fetching subscription status ${error}`);
        throw error;
    }
};
