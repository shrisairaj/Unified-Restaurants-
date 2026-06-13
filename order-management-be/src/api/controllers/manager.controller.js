import CryptoJS from 'crypto-js';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import managerService from '../services/manager.service.js';
import { STATUS_CODE } from '../utils/common.js';
import {
    updateManagerValidation,
    createManagerValidation,
    updateManagerCredentialsValidation
} from '../validations/manager.validation.js';

const fetch = async (req, res) => {
    try {
        const { query } = req;
        const { limit, skip, sortKey, sortOrder, filterKey, filterValue } = query;

        const payload = {
            limit,
            skip,
            sortKey,
            sortOrder,
            filterKey,
            filterValue,
            owner: req.user.id
        };
        logger('debug', 'Received request to list managers with query:', { query });

        const result = await managerService.fetch(payload);
        logger('info', 'List of mangers fetched successfully');

        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error while fetching managers', { error });
        return res.status(error.code).send({ message: error.message });
    }
};

const update = async (req, res) => {
    try {
        logger('debug', 'Received request to update assigned manager');

        const managerId = req.params.id;
        const ownerId = req.user.id;

        const validation = updateManagerValidation(req.body);
        if (validation.error) {
            logger('error', `Update validation error ${JSON.stringify({ error: validation.error })}`);
            return res.status(STATUS_CODE.BAD_REQUEST).send({ message: validation.error.message });
        }

        const { prev, current } = req.body;

        logger(
            'debug',
            `update assigned manager prev hotel : ${prev}, current hotel : ${current}, manager : ${managerId}`
        );
        const result = await managerService.update(prev, current, managerId, ownerId);
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error while updating managers', { error });
        return res.status(error.code).send({ message: error.message });
    }
};

const updateCredentials = async (req, res) => {
    try {
        const managerId = req.params.id;
        const ownerId = req.user.id;
        const { email, password } = req.body;

        const payload = { email };
        if (password) {
            const decryptedPassword = CryptoJS.AES.decrypt(password, env.cryptoSecret).toString(CryptoJS.enc.Utf8);
            payload.password = decryptedPassword;
        }

        const validation = updateManagerCredentialsValidation(payload);
        if (validation.error) {
            logger('error', `Update credentials validation error ${JSON.stringify({ error: validation.error })}`);
            return res.status(STATUS_CODE.BAD_REQUEST).send({ message: validation.error.message });
        }

        const result = await managerService.updateCredentials(managerId, ownerId, payload);
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error while updating manager credentials', { error });
        return res.status(error.code).send({ message: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const managerId = req.params.id;
        const ownerId = req.user.id;
        logger('debug', `Received request to remove manager ${managerId}`);

        const result = await managerService.remove(managerId, ownerId);
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error while updating managers', { error });
        return res.status(error.code).send({ message: error.message });
    }
};

const getAssignable = async (req, res) => {
    try {
        const ownerId = req.user.id;
        logger('debug', `Fetch assignable managers for owner ${ownerId}`);

        const { filter } = req.query;
        const managers = await managerService.getAssignable(ownerId, filter);
        logger('debug', `Assignable managers data ${managers}`);

        return res.status(STATUS_CODE.OK).send(managers);
    } catch (error) {
        logger('error', 'Error while fetching assognable managers', { error });
        return res.status(error.code).send({ message: error.message });
    }
};

const create = async (req, res) => {
    try {
        logger('debug', 'Received request to create manager with data:', { body: req.body });

        // Convert phoneNumber to string if it's a number
        const validationPayload = {
            ...req.body,
            phoneNumber: String(req.body.phoneNumber)
        };

        const validation = createManagerValidation(validationPayload);
        if (validation.error) {
            logger('error', `Create manager validation error ${JSON.stringify({ error: validation.error })}`);
            return res.status(STATUS_CODE.BAD_REQUEST).send({ message: validation.error.message });
        }

        const ownerId = req.user.id;
        const payload = {
            ...validationPayload,
            ownerId
        };

        const result = await managerService.create(payload);
        logger('info', 'Manager created successfully');

        return res.status(STATUS_CODE.CREATED).send(result);
    } catch (error) {
        logger('error', 'Error while creating manager', { error });
        return res.status(error.code).send({ message: error.message });
    }
};

export default {
    fetch,
    update,
    updateCredentials,
    remove,
    getAssignable,
    create
};
