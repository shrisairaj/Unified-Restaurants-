import { toast } from 'react-toastify';
import { all, call, put, takeLatest } from 'redux-saga/effects';
import * as service from '../../services/hotel.service';
import { setRevenueData, setRevenueError } from '../slice/revenue.slice';
import { GET_REVENUE_REQUEST } from '../types/revenue';

function* getRevenueRequestSaga() {
    try {
        const data = yield call(service.revenue);

        const weeklyTrend = [
            {
                id: 'Weekly',
                data: Object.keys(data.weeklyTrend || {}).map((item) => ({
                    x: item,
                    y: data.weeklyTrend[item]
                }))
            }
        ];

        const monthlyTrend = Object.keys(data.monthlyTrend || {}).map((item) => ({
            month: item,
            value: data.monthlyTrend[item]
        }));

        yield put(
            setRevenueData({
                summary: data.summary,
                weeklyTrend,
                monthlyTrend,
                hotelBreakdown: data.hotelBreakdown || []
            })
        );
    } catch (error) {
        yield put(setRevenueError(error?.message || 'Failed to fetch revenue analytics'));
        toast.error(`Failed to fetch revenue analytics: ${error?.message}`);
    }
}

export default function* revenueSaga() {
    yield all([takeLatest(GET_REVENUE_REQUEST, getRevenueRequestSaga)]);
}
