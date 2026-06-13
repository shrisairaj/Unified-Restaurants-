import React from 'react';
import CryptoJS from 'crypto-js';
import { Form, Formik } from 'formik';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AuthContainer from '../../components/AuthContainer';
import CustomButton from '../../components/CustomButton';
import CustomFormGroup from '../../components/CustomFormGroup';
import env from '../../config/env';
import { loginRequest } from '../../store/slice';
import { loginSchema } from '../../validations/auth';

function AdminLogin() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const initialValues = {
        email: 'admin@gmail.com',
        password: 'admin@123',
        role: 'ADMIN'
    };

    const handleSubmit = (values, { setSubmitting }) => {
        setSubmitting(true);
        const enpass = CryptoJS.AES.encrypt(values.password, env.cryptoSecret).toString();
        const data = { ...values, password: enpass };
        dispatch(loginRequest({ data, navigate }));
        setSubmitting(false);
    };

    return (
        <AuthContainer title="Admin Login">
            <Formik initialValues={initialValues} validationSchema={loginSchema} onSubmit={handleSubmit}>
                {({ isSubmitting, isValid, dirty }) => (
                    <Form className="d-flex flex-column">
                        <CustomFormGroup name="email" type="email" label="Email" />
                        <CustomFormGroup name="password" type="password" label="Password" />
                        <div className="mt-2">
                            <label className="small text-muted m-0 d-flex">
                                Role
                                <div className="text-danger ms-1">*</div>
                            </label>
                            <input className="form-control" value="ADMIN" disabled />
                        </div>
                        <CustomButton
                            label="Login"
                            disabled={isSubmitting || !isValid || !dirty}
                            type="submit"
                            className="mx-auto my-4"
                        />
                    </Form>
                )}
            </Formik>
        </AuthContainer>
    );
}

export default AdminLogin;
