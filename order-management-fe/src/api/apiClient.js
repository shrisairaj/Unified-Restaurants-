import axios from 'axios';
import CryptoJS from 'crypto-js';
import { toast } from 'react-toastify';
import env from '../config/env';
import store from '../store';
import { setIsLoading } from '../store/slice/app.slice';

export const instance = axios.create({
    baseURL: env.baseUrl,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

const ERROR_MESSAGE = ['TOKEN_NOT_FOUND', 'TOKEN_VERIFICATION_FAILED'];

instance.interceptors.request.use(
    (config) => {
        store.dispatch(setIsLoading(true));
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        store.dispatch(setIsLoading(false));
        return Promise.reject(error);
    }
);
instance.interceptors.response.use(
    (response) => {
        store.dispatch(setIsLoading(false));
        return response;
    },
    (error) => {
        if (error.response && ERROR_MESSAGE.includes(error.response.data?.message)) {
            localStorage.clear();
            window.location.replace('/');
        }
        if (error.response && error.response.status === 403 && error.response.data?.message === 'Subscription expired') {
            store.dispatch(setIsLoading(false));
            if (window.location.pathname !== '/subscription' && window.location.pathname !== '/login' && window.location.pathname !== '/') {
                let role = 'OWNER';
                try {
                    const encryptedData = localStorage.getItem('data');
                    if (encryptedData) {
                        const decrypted = CryptoJS.AES.decrypt(encryptedData, env.cryptoSecret).toString(CryptoJS.enc.Utf8);
                        if (decrypted) {
                            role = JSON.parse(decrypted).role;
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse user role in apiClient:', e);
                }

                if (role === 'MANAGER') {
                    toast.error('Your cafe\'s subscription has expired. Please contact the owner.');
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace('/login');
                } else {
                    toast.error('Your trial/subscription has expired. Please subscribe to continue.');
                    window.location.replace('/subscription');
                }
            }
        }
        store.dispatch(setIsLoading(false));
        throw error;
    }
);

export const method = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    PATCH: 'patch',
    DELETE: 'delete'
};

export const api = async (method, path, body) => {
    try {
        let res = {};
        switch (method) {
            case 'get':
                res = await instance.get(path);
                break;
            case 'post':
                res = await instance.post(path, body);
                break;
            case 'put':
                res = await instance.put(path, body);
                break;
            case 'patch':
                res = await instance.patch(path, body);
                break;
            case 'delete':
                res = await instance.delete(path, { data: body });
                break;
            default:
                throw new Error('Invalid Method');
        }
        return res.data;
    } catch (error) {
        throw new Error(error?.response?.data?.message || error.message);
    }
};
