import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
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

    return allowPublicAccess ? <Outlet /> : <Navigate to="/dashboard" />;
}

export default PublicRoutes;
