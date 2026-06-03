import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from '../../components/Loader';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { getUserRequest } from '../../store/slice';

function AuthRoutes() {
    const token = localStorage.getItem('token');
    const dispatch = useDispatch();
    const location = useLocation();
    const user = useSelector((state) => state.user.data);

    console.log('CURRENT PATH', location.pathname);
    console.log('USER =>', user);
    console.log('STATUS =>', user?.subscriptionStatus);
    console.log('END DATE =>', user?.subscriptionEndAt);
    console.log('NOW =>', new Date());

    useEffect(() => {
        if (token && Object.keys(user).length === 0) {
            dispatch(getUserRequest());
        }
    }, [token, user, dispatch]);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (Object.keys(user).length === 0) {
        return <Loader />;
    }

    if (user.role === 'OWNER') {
        const isExpired =
            user.subscriptionStatus === 'EXPIRED' ||
            (user.subscriptionStatus === 'ACTIVE' &&
                user.subscriptionEndAt &&
                new Date(user.subscriptionEndAt).getTime() < Date.now()) ||
            (user.subscriptionStatus === 'TRIAL' &&
                user.trialEndAt &&
                new Date(user.trialEndAt).getTime() < Date.now());

        if (isExpired) {
            if (location.pathname !== '/subscription') {
                return <Navigate to="/subscription" replace />;
            }
        }
    }

    if (user.role === 'MANAGER') {
        if (location.pathname === '/subscription') {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return (
        <>
            <Navbar />
            <Sidebar />
        </>
    );
}

export default AuthRoutes;
