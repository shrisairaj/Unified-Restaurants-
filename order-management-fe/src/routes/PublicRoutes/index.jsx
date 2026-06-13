import React from 'react';
import CryptoJS from 'crypto-js';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import env from '../../config/env';
import { CUSTOMER_ORDER_ROUTE_PREFIX, VERIFICATION_ROUTE } from '../../utils/constants';

function PublicRoutes() {
    const token = localStorage.getItem('token');
    const { pathname } = useLocation();
    const isCustomerOrderRoute = pathname.startsWith(CUSTOMER_ORDER_ROUTE_PREFIX) || pathname.startsWith('/track-order/');
    const validRedirection = window.location.href.includes(`${pathname}?token=`);
    const allowPublicAccess =
        !token ||
        isCustomerOrderRoute ||
        (VERIFICATION_ROUTE.includes(pathname) && validRedirection);

    if (!allowPublicAccess) {
        try {
            const encryptedData = localStorage.getItem('data');
            if (encryptedData) {
                const decrypted = JSON.parse(
                    CryptoJS.AES.decrypt(encryptedData, env.cryptoSecret).toString(CryptoJS.enc.Utf8)
                );
                const role = decrypted.role?.toUpperCase();
                if (role === 'ADMIN') {
                    return <Navigate to="/admin/dashboard" />;
                }
                if (role === 'OWNER') {
                    return <Navigate to="/hotels" />;
                }
            }
        } catch (error) {
            console.warn('Unable to resolve role for public route redirect', error);
        }
        return <Navigate to="/dashboard" />;
    }

    return <Outlet />;
}

export default PublicRoutes;
