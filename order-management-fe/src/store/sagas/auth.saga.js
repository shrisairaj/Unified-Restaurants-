import CryptoJS from 'crypto-js';
import { toast } from 'react-toastify';
import { all, call, put, takeLatest } from 'redux-saga/effects';
import env from '../../config/env';
import * as service from '../../services/auth.service';
import * as notificationService from '../../services/notification.service';
import { MANAGER_TABS, OWNER_TABS, USER_ROLES, VERIFICATION_ROUTE } from '../../utils/constants';
import {
    clearGlobalHotelId,
    getUserRequest,
    getUserSuccess,
    setGlobalHotelId,
    setNotificationData,
    setSettingsFormData,
    setVerifyUserName
} from '../slice';
import {
    FORGOT_PASSWORD_REQUEST,
    GET_NOTIFICATION_REQUEST,
    GET_USER_REQUEST,
    LOGIN_USER_REQUEST,
    LOGOUT_USER_REQUEST,
    REGISTER_USER_REQUEST,
    RESET_PASSWORD_REQUEST,
    UPDATE_NOTIFICATION_REQUEST,
    UPDATE_USER_REQUEST,
    VERIFY_USER_REQUEST
} from '../types';

function* loginUserRequestSaga(action) {
    try {
        const { data, navigate } = action.payload;
        const res = yield service.loginUser(data);

        localStorage.setItem('token', res.token);
        localStorage.setItem('data', res.data);

        toast.success('Login successfully');
        yield put(getUserRequest({ navigate }));
        yield registerNotification();
    } catch (error) {
        // Show backend-provided message (e.g. role mismatch) directly
        toast.error(error?.message || 'Failed to login');
    }
}

function* registerUserRequestSaga(action) {
    try {
        const { data, navigate } = action.payload;
        yield service.registerUser(data);
        toast.success('User registered successfully. You can now log in.');
        navigate('/');
    } catch (error) {
        toast.error(`Failed to register user: ${error?.message}`);
    }
}

function* verifyUserRequestSaga(action) {
    const { data, navigate } = action.payload;
    try {
        const { name, ...rest } = data;
        const res = yield service.verifyUser(rest);

        localStorage.setItem('token', res.token);
        localStorage.setItem('data', res.data);

        toast.success('Verified successfully');
        yield put(setVerifyUserName(name));
        yield put(getUserRequest({ navigate }));
        yield registerNotification();
    } catch (error) {
        toast.error(`Failed to verify email: ${error?.message}`);
        navigate('/login');
    }
}

function* registerNotification() {
    try {
        const registration = yield navigator.serviceWorker.register('/serviceWorker.js');
        yield navigator.serviceWorker.ready;

        const subscription = yield registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: env.notificationKey
        });

        yield call(notificationService.subscribe, subscription);
    } catch (error) {
        console.error(`Failed to register notification : ${error?.message}`);
    }
}

function* forgotPasswordRequestSaga(action) {
    try {
        const { data, navigate } = action.payload;
        yield service.forgotPasswordUser(data);
        toast.success('Reset password email sent successfully');
        navigate('/');
    } catch (error) {
        toast.error(`Failed to send: ${error?.message}`);
    }
}

function* resetPasswordRequestSaga(action) {
    try {
        const { data, navigate } = action.payload;
        yield service.resetPasswordUser(data);
        toast.success('Password reset successfully');
        navigate('/');
    } catch (error) {
        toast.error(`Failed to reset password: ${error?.message}`);
    }
}

function* persistManagerSession(res) {
    if (res.role.toUpperCase() !== USER_ROLES[1] || !res.hotelId) {
        return;
    }

    yield put(setGlobalHotelId(res.hotelId));
    const details = CryptoJS.AES.encrypt(
        JSON.stringify({ role: res.role, hotelId: res.hotelId }),
        env.cryptoSecret
    ).toString();
    localStorage.setItem('data', details);
}

function* getUserRequestSaga(action) {
    try {
        const navigate = action.payload?.navigate;
        const res = yield service.getUser();
        yield put(getUserSuccess(res));

        if (res.role.toUpperCase() === USER_ROLES[1]) {
            yield * persistManagerSession(res);
        } else {
            const viewData = JSON.parse(
                CryptoJS.AES.decrypt(localStorage.getItem('data'), env.cryptoSecret).toString(CryptoJS.enc.Utf8)
            );
            if (viewData.hotelId) {
                yield put(setGlobalHotelId(viewData.hotelId));
            }
        }

        if (navigate) {
            const viewData = JSON.parse(
                CryptoJS.AES.decrypt(localStorage.getItem('data'), env.cryptoSecret).toString(CryptoJS.enc.Utf8)
            );

            const path = window.location.pathname;

            if (
                (VERIFICATION_ROUTE.includes(path.toLowerCase()) && res.role.toUpperCase() === USER_ROLES[0]) ||
                (res.role.toUpperCase() === USER_ROLES[0] &&
                    Object.keys(viewData).length === 1 &&
                    [...MANAGER_TABS].find((obj) => obj.path === path))
            ) {
                navigate('/hotels');
            }

            if (
                (VERIFICATION_ROUTE.includes(path.toLowerCase()) && res.role.toUpperCase() === USER_ROLES[1]) ||
                ((res.role.toUpperCase() === USER_ROLES[1] || Object.keys(viewData).length === 2) &&
                    [...OWNER_TABS].find((obj) => obj.path === path))
            ) {
                navigate('/dashboard');
            }

            if (res.role.toUpperCase() === USER_ROLES[2] && !path.startsWith('/admin')) {
                navigate('/admin/dashboard');
            }
        }
    } catch (error) {
        console.error(`Failed to get user: ${error?.message}`);
    }
}

function* updateUserRequestSaga(action) {
    try {
        const res = yield service.updateUser(action.payload);
        yield put(getUserSuccess(res));
        toast.success('User details updated successfully');
        yield put(setSettingsFormData(false));
    } catch (error) {
        console.error(`Failed to update user: ${error?.message}`);
        yield put(setSettingsFormData(false));
        toast.error('Failed to update user details');
    }
}

function* logoutUserRequestSaga() {
    try {
        yield put(clearGlobalHotelId());
        try {
            yield notificationService.unsubscribe();
        } catch (e) {
            console.warn('Unsubscribe failed during logout:', e);
        }
        if ('serviceWorker' in navigator) {
            try {
                const registrations = yield navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    yield registration.unregister();
                }
            } catch (e) {
                console.warn('Service worker unregister failed during logout:', e);
            }
        }

        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/');
    } catch (error) {
        console.error(`Failed to logout user: ${error?.message}`);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/');
    }
}

function* getNotificationRequestSaga() {
    try {
        const res = yield notificationService.fetch();
        yield put(
            setNotificationData({
                data: res.rows,
                count: res.count,
                open: true
            })
        );
    } catch (error) {
        console.error(`Failed to fetch notification: ${error?.message}`);
        toast.error('Failed to fetch notification');
    }
}

function* updateNotificationRequestSaga() {
    try {
        yield notificationService.update();
        yield put(setNotificationData({ data: [], count: 0, open: false }));
    } catch (error) {
        console.error(`Failed to update notification: ${error?.message}`);
        toast.error('Failed to set notifications as read');
    }
}

export default function* authSaga() {
    yield all([
        takeLatest(LOGIN_USER_REQUEST, loginUserRequestSaga),
        takeLatest(LOGOUT_USER_REQUEST, logoutUserRequestSaga),
        takeLatest(REGISTER_USER_REQUEST, registerUserRequestSaga),
        takeLatest(VERIFY_USER_REQUEST, verifyUserRequestSaga),
        takeLatest(FORGOT_PASSWORD_REQUEST, forgotPasswordRequestSaga),
        takeLatest(RESET_PASSWORD_REQUEST, resetPasswordRequestSaga),
        takeLatest(GET_USER_REQUEST, getUserRequestSaga),
        takeLatest(UPDATE_USER_REQUEST, updateUserRequestSaga),
        takeLatest(GET_NOTIFICATION_REQUEST, getNotificationRequestSaga),
        takeLatest(UPDATE_NOTIFICATION_REQUEST, updateNotificationRequestSaga)
    ]);
}
