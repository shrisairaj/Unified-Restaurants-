import { createSlice } from '@reduxjs/toolkit';
import { REVENUE } from '../types/revenue';

const revenueSlice = createSlice({
    name: REVENUE,
    initialState: {
        loading: false,
        error: null,
        summary: { today: 0, week: 0, month: 0, year: 0 },
        weeklyTrend: [],
        monthlyTrend: [],
        hotelBreakdown: []
    },
    reducers: {
        getRevenueRequest(state) {
            state.loading = true;
            state.error = null;
        },
        setRevenueData(state, action) {
            state.loading = false;
            state.error = null;
            state.summary = action.payload.summary;
            state.weeklyTrend = action.payload.weeklyTrend;
            state.monthlyTrend = action.payload.monthlyTrend;
            state.hotelBreakdown = action.payload.hotelBreakdown;
        },
        setRevenueError(state, action) {
            state.loading = false;
            state.error = action.payload;
        }
    }
});

export const { getRevenueRequest, setRevenueData, setRevenueError } = revenueSlice.actions;

export const revenueReducer = revenueSlice.reducer;
