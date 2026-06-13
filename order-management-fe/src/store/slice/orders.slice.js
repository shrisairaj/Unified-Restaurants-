import { createSlice } from '@reduxjs/toolkit';
import { ORDER } from '../types';

const ordersSlice = createSlice({
    name: ORDER,
    reducers: {
        getActiveOrderRequest() {},
        getCompletedOrdersRequest() {},
        getActiveOrderSuccess(state, action) {
            state.activeOrder = action.payload;
        },
        getCompletedOrdersSuccess(state, action) {
            const { data, count } = action.payload;
            state.completedOrders = data;
            state.completedCount = count;
        },
        setSelectedOrder(state, action) {
            const data = action.payload;
            if (data) {
                state.selectedOrder = {
                    title: 'Order Details',
                    closeText: 'Close',
                    data: {
                        id: data.id,
                        menu: data.menu,
                        price: data.price,
                        tipAmount: data.tipAmount,
                        sgst: data.sgst,
                        cgst: data.cgst,
                        totalPrice: data.totalPrice,
                        paymentId: data.paymentId
                    }
                };
            } else {
                state.selectedOrder = data;
            }
        },
        updatePendingOrderRequest() {},
        setOrderSelectedTable(state, action) {
            state.selectedTable = action.payload;
        },
        setOrderSorting(state, action) {
            state.sorting = action.payload;
        },
        setOrderFiltering(state, action) {
            state.filtering = action.payload;
        },
        setOrderPagination(state, action) {
            state.pagination = action.payload;
        },
        setPaymentRequest(state, action) {
            state.paymentRequest = action.payload;
        },
        getOrderDetailsRequest(state) {
            state.orderDetailsLoading = true;
            state.orderDetailsError = null;
        },
        getOrderDetailsSuccess(state, action) {
            state.orderDetailsLoading = false;
            state.orderDetails = action.payload;
        },
        getOrderDetailsFailure(state, action) {
            state.orderDetailsLoading = false;
            state.orderDetailsError = action.payload;
        },
        updateOrderStatusRequest(state) {
            state.updateStatusLoading = true;
            state.updateStatusError = null;
        },
        updateOrderStatusSuccess(state) {
            state.updateStatusLoading = false;
        },
        updateOrderStatusFailure(state, action) {
            state.updateStatusLoading = false;
            state.updateStatusError = action.payload;
        },
        paymentConfirmationRequest() {},
        paymentConfirmationSuccess(state) {
            state.paymentRequest = false;
        },
        clearOrderDetails(state) {
            state.orderDetails = null;
            state.orderDetailsError = null;
        }
    },
    initialState: {
        activeOrder: {},
        completedOrders: [],
        selectedOrder: false,
        completedCount: 0,
        selectedTable: '',
        sorting: [],
        filtering: { field: 'orderNumber', value: '' },
        pagination: {
            pageIndex: 0,
            pageSize: 10
        },
        paymentRequest: false,
        orderDetails: null,
        orderDetailsLoading: false,
        orderDetailsError: null,
        updateStatusLoading: false,
        updateStatusError: null
    }
});
export const {
    getActiveOrderRequest,
    getActiveOrderSuccess,
    getCompletedOrdersRequest,
    getCompletedOrdersSuccess,
    setSelectedOrder,
    updatePendingOrderRequest,
    setOrderSelectedTable,
    setOrderSorting,
    setOrderFiltering,
    setOrderPagination,
    setPaymentRequest,
    getOrderDetailsRequest,
    getOrderDetailsSuccess,
    getOrderDetailsFailure,
    updateOrderStatusRequest,
    updateOrderStatusSuccess,
    updateOrderStatusFailure,
    paymentConfirmationRequest,
    paymentConfirmationSuccess,
    clearOrderDetails
} = ordersSlice.actions;

export const ordersReducer = ordersSlice.reducer;
