import { api, method, instance } from '../api/apiClient';

export const getActiveOrders = async (tableId) => {
    try {
        return await api(method.GET, `/order/active/${tableId}`);
    } catch (error) {
        console.error(`Error while getting active orders ${error}`);
        throw error;
    }
};

export const getCompletedOrders = async ({
    hotelId,
    skip = 0,
    limit = 10,
    sortKey = '',
    sortOrder = '',
    filterKey = '',
    filterValue = ''
}) => {
    try {
        const query = `skip=${skip}&limit=${limit}&sortKey=${sortKey}&sortOrder=${sortOrder}&filterKey=${filterKey}&filterValue=${filterValue}`;
        return await api(method.GET, `/order/completed/${hotelId}?${query}`);
    } catch (error) {
        console.error(`Error while getting completed order details ${error}`);
        throw error;
    }
};

export const updatePendingOrders = async (payload) => {
    try {
        return await api(method.PUT, `/order/pending`, payload);
    } catch (error) {
        console.error(`Error while updating pending order details ${error}`);
        throw error;
    }
};

export const feedback = async (payload) => {
    try {
        return await api(method.POST, `/order/feedback`, payload);
    } catch (error) {
        console.error(`Error while sending order feedback ${error}`);
        throw error;
    }
};

export const getOrderDetails = async (hotelId, orderId) => {
    try {
        return await api(method.GET, `/order/details/${hotelId}/${orderId}`);
    } catch (error) {
        console.error(`Error while getting order details ${error}`);
        throw error;
    }
};

export const updateOrderStatus = async (hotelId, orderId, status) => {
    try {
        const payload = { orderId, status };
        return await api(method.PUT, `/order/status/${hotelId}`, payload);
    } catch (error) {
        console.error(`Error while updating order status ${error}`);
        throw error;
    }
};

export const downloadInvoice = async (hotelId, orderId, hotelName = 'hotel', orderNumber = 'order') => {
    try {
        const response = await instance.get(`/order/invoice/${hotelId}/${orderId}`, {
            responseType: 'blob'
        });

        const blob = new Blob([response.data], {
            type: 'application/pdf'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const cleanedHotelName = hotelName.toLowerCase().replace(/\s+/g, '-');
        const cleanedOrderNumber = orderNumber.toLowerCase();
        link.download = `${cleanedHotelName}-${cleanedOrderNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error(`Error while downloading invoice ${error}`);
        throw error;
    }
};

export const getOrderStatus = async (orderId) => {
    try {
        return await api(method.GET, `/order/${orderId}/status`);
    } catch (error) {
        console.error(`Error while getting order status ${error}`);
        throw error;
    }
};

export const getPublicOrderDetails = async (orderId) => {
    try {
        return await api(method.GET, `/order/${orderId}/details`);
    } catch (error) {
        console.error(`Error while getting public order details ${error}`);
        throw error;
    }
};

export const resetTable = async (tableId) => {
    try {
        return await api(method.POST, `/order/table/${tableId}/reset`);
    } catch (error) {
        console.error(`Error while resetting table ${error}`);
        throw error;
    }
};

export const cancelOrder = async (orderId) => {
    try {
        return await api(method.PATCH, `/order/${orderId}/cancel`);
    } catch (error) {
        console.error(`Error while cancelling order ${error}`);
        throw error;
    }
};
