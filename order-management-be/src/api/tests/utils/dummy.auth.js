import moment from 'moment';
import { USER_STATUS } from '../../models/user.model.js';
import { STATUS_CODE } from '../../utils/common.js';

export const register = {
    invalidEmailData: {
        body: {
            firstName: 'test',
            lastName: 'test',
            phoneNumber: '1234567890',
            email: 'test$test.vi', // invalid email
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0='
        },
        res: {
            code: STATUS_CODE.BAD_REQUEST,
            data: { message: '"email" must be a valid email' }
        }
    },
    invalidPasswordData: {
        body: {
            firstName: 'test',
            lastName: 'test',
            phoneNumber: '1234567890',
            email: 'test@test.com',
            password: 'U2FsdGVkX1/PbcvP3vZsvabHsM50meL3a8t5IgcC2bA=' // invalid password Test1234
        },
        res: {
            code: STATUS_CODE.BAD_REQUEST,
            data: {
                message: '"password" with value "Test1234" fails to match the required pattern'
            }
        }
    },
    invalidPhoneData: {
        body: {
            firstName: 'test',
            lastName: 'test',
            phoneNumber: '123456789', // invalid phone with 9 digits
            email: 'test@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0='
        },
        res: {
            code: STATUS_CODE.BAD_REQUEST,
            data: {
                message: '"phoneNumber" must be a 10 digit number'
            }
        }
    },
    invalidData: {
        body: {
            phoneNumber: '1234567890',
            email: 'test@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0='
        },
        res: {
            code: STATUS_CODE.BAD_REQUEST,
            data: { message: '"firstName" is required' }
        }
    },
    user: {
        body: {
            firstName: 'test',
            lastName: 'test',
            phoneNumber: '1234567890',
            email: 'test@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0='
        },
        db: {
            id: '60c688d6-5442-4569-9c8c-3f973b3ba554',
            firstName: 'test',
            lastName: 'test',
            phoneNumber: '1234567890',
            email: 'test@test.com',
            role: 'OWNER',
            status: 'INACTIVE'
        },
        res: {
            code: STATUS_CODE.CREATED
        }
    }
};

export const login = {
    unregisteredEmailData: {
        body: {
            email: 'unregistered-email@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0=', // Test@1234
            role: 'OWNER'
        },
        res: {
            code: STATUS_CODE.NOT_FOUND,
            data: { message: 'Email not registered' }
        }
    },
    incorrectPasswordData: {
        body: {
            email: 'valid-email@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0=', // Test@1234
            role: 'OWNER'
        },
        db: {
            email: 'valid-email@test.com',
            password: 'U2FsdGVkX19mkLtgxmDHjbQ9jUN+TZQcPA4Y/2zoMvg=', // Test@1237
            role: 'OWNER'
        },
        res: {
            code: STATUS_CODE.UNAUTHORIZED,
            data: { message: 'Invalid password' }
        }
    },
    inActiveData: {
        body: {
            email: 'valid-email@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0=', // Test@1234
            role: 'OWNER'
        },
        db: {
            email: 'valid-email@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0=', // Test@1234
            status: USER_STATUS[1],
            role: 'OWNER'
        },
        res: {
            code: STATUS_CODE.FORBIDDEN,
            data: { message: 'Email is not verified' }
        }
    },
    successLoginData: {
        body: {
            email: 'valid-email@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0=', // Test@1234
            role: 'OWNER'
        },
        db: {
            email: 'valid-email@test.com',
            password: 'U2FsdGVkX1+w73Hs6kiEx+jldPlKMnZ+wlDKkYyKoY0=', // Test@1234
            status: USER_STATUS[0],
            role: 'OWNER'
        },
        res: {
            code: STATUS_CODE.OK,
            data: { message: 'Email not verified' }
        }
    }
};

export const verify = {
    userAlreadyVerifiedData: {
        body: {
            email: 'valid-test@test.com'
        },
        db: {
            status: USER_STATUS[0]
        },
        res: {
            code: STATUS_CODE.BAD_REQUEST,
            data: { message: 'User already verified Please try login' }
        }
    },
    linkExpiredData: {
        body: {
            email: 'valid-test@test.com',
            expires: moment().subtract(1, 'hour').valueOf()
        },
        db: {
            status: USER_STATUS[1]
        },
        res: {
            code: STATUS_CODE.GONE,
            data: {
                message: `Sorry, the link has expired. We've sent a new one to your email. Please check and try again.`
            }
        }
    },
    verifyEmailData: {
        body: {
            email: 'valid-test@test.com',
            expires: moment().add(1, 'hour').valueOf()
        },
        db: {
            status: USER_STATUS[1]
        },
        res: {
            code: STATUS_CODE.OK,
            data: { status: USER_STATUS[0] }
        }
    }
};

export const forget = {
    unverifiedData: {
        body: {
            email: 'valid-email@test.com'
        },
        db: {
            status: USER_STATUS[1]
        },
        res: {
            code: STATUS_CODE.FORBIDDEN,
            data: { message: 'User has not verified email' }
        }
    },
    forgotPasswordData: {
        body: {
            email: 'valid-email@test.com'
        },
        db: {
            status: USER_STATUS[0]
        },
        res: {
            code: STATUS_CODE.OK,
            data: { message: 'Recover password link sent. Please check your email.' }
        }
    }
};

export const reset = {
    resetPasswordData: {
        body: {
            email: 'valid-email@test.com',
            newPassword: 'U2FsdGVkX19mkLtgxmDHjbQ9jUN+TZQcPA4Y/2zoMvg=', // Test@1237
            expires: moment().add(1, 'hour').valueOf()
        },
        db: {
            password: ''
        },
        res: {
            code: STATUS_CODE.OK,
            data: { message: 'Password reset successfully' }
        }
    }
};
