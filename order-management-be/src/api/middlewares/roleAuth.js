import logger from '../../config/logger.js';
import { USER_ROLES } from '../models/user.model.js';
import { STATUS_CODE } from '../utils/common.js';

export const ownerAuthentication = (req, res, next) => {
    if (req.user.role !== USER_ROLES[0]) {
        logger('warn', { message: 'Unauthorized access attempted by non-owner' });
        return res.status(STATUS_CODE.UNAUTHORIZED).json({ message: 'Access restricted. Limited to owners.' });
    }

    logger('info', 'Owner authentication successful', { user: req.user });
    next();
};

export const adminAuthentication = (req, res, next) => {
    if (req.user.role !== USER_ROLES[2]) {
        logger('warn', { message: 'Unauthorized access attempted by non-admin' });
        return res.status(STATUS_CODE.UNAUTHORIZED).json({ message: 'Access restricted. Limited to admins.' });
    }

    logger('info', 'Admin authentication successful', { user: req.user });
    next();
};
