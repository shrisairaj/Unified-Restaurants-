import Joi from 'joi';
import logger from '../../config/logger.js';
import { CustomError } from '../utils/common.js';

export const updateManagerValidation = (payload) => {
    try {
        const schema = Joi.object({
            prev: Joi.string().optional(),
            current: Joi.string().required()
        }).or('prev', 'current');
        return schema.validate(payload);
    } catch (error) {
        logger('error', 'Error in update manager validation', { error });
        throw CustomError(error.code, error.message);
    }
};

export const updateManagerCredentialsValidation = (payload) => {
    try {
        const schema = Joi.object({
            email: Joi.string().email().messages({
                'string.email': 'Please enter a valid email'
            }).optional(),
            password: Joi.string()
                .pattern(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
                .optional()
        }).or('email', 'password');
        return schema.validate(payload);
    } catch (error) {
        logger('error', 'Error in update manager credentials validation', { error });
        throw CustomError(error.code, error.message);
    }
};

export const createManagerValidation = (payload) => {
    try {
        const schema = Joi.object({
            firstName: Joi.string().required().messages({
                'string.empty': 'First name is required'
            }),
            lastName: Joi.string().required().messages({
                'string.empty': 'Last name is required'
            }),
            phoneNumber: Joi.string()
                .pattern(/^[0-9]{10}$/)
                .required()
                .messages({
                    'string.empty': 'Phone number is required',
                    'string.pattern.base': 'Phone number must be 10 digits'
                }),
            email: Joi.string()
                .email()
                .required()
                .messages({
                    'string.empty': 'Email is required',
                    'string.email': 'Please enter a valid email'
                }),
            password: Joi.string()
                .min(8)
                .required()
                .messages({
                    'string.empty': 'Password is required',
                    'string.min': 'Password must be at least 8 characters'
                }),
            hotelId: Joi.string().required().messages({
                'string.empty': 'Hotel/Cafe is required'
            })
        });
        return schema.validate(payload);
    } catch (error) {
        logger('error', 'Error in create manager validation', { error });
        throw CustomError(error.code, error.message);
    }
};
