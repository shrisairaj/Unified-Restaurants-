import React from 'react';
import CryptoJS from 'crypto-js';
import { Form, Formik, Field, ErrorMessage } from 'formik';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AuthContainer from '../../components/AuthContainer';
import CustomButton from '../../components/CustomButton';
import CustomFormGroup from '../../components/CustomFormGroup';
import CustomLink from '../../components/CustomLink';
import env from '../../config/env';
import { loginRequest } from '../../store/slice';
import { loginSchema } from '../../validations/auth';

function Login() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleOnClickSignup = (e) => {
        e.preventDefault();
        navigate('/signup');
    };

    const handleOnClickForgotPassword = (e) => {
        e.preventDefault();
        navigate('/forgot-password');
    };

    const initialValues = {
        email: '',
        password: '',
        role: ''
    };

    const handleSubmit = (values, { setSubmitting }) => {
        setSubmitting(true);
        const enpass = CryptoJS.AES.encrypt(values.password, env.cryptoSecret).toString();
        const data = { ...values, password: enpass };
        dispatch(loginRequest({ data, navigate }));
        setSubmitting(false);
    };

    return (
        <AuthContainer title={'Login'}>
            <Formik initialValues={initialValues} validationSchema={loginSchema} onSubmit={handleSubmit}>
                {({ isSubmitting, isValid, dirty }) => (
                    <Form className="d-flex flex-column">
                        <CustomFormGroup name="email" type="email" label="Email" />
                        <CustomFormGroup name="password" type="password" label="Password" />
                        <div className="mt-2">
                            <label htmlFor="role" className="small text-muted m-0 d-flex">
                                Role
                                <div className="text-danger ms-1">*</div>
                            </label>
                            <Field
                                as="select"
                                name="role"
                                id="role"
                                className="form-select"
                            >
                                <option value="">-- Select Role --</option>
                                <option value="OWNER">Owner</option>
                                <option value="MANAGER">Manager</option>
                                <option value="ADMIN">Admin</option>
                            </Field>
                            <ErrorMessage name="role">
                                {msg => <div className="text-danger small">{msg}</div>}
                            </ErrorMessage>
                        </div>
                        <CustomButton
                            label="Login"
                            disabled={isSubmitting || !isValid || !dirty}
                            type="submit"
                            className="mx-auto my-4"
                        />
                        <div className="text-center">
                            <p className="label-font m-0">
                                {`Don't have an account ? `}
                                <CustomLink onClick={handleOnClickSignup} text="Sign Up" />
                            </p>
                            <p className="label-font m-0">
                                <CustomLink text="Forgot your password ?" onClick={handleOnClickForgotPassword} />
                            </p>
                        </div>
                    </Form>
                )}
            </Formik>
        </AuthContainer>
    );
}

export default Login;
