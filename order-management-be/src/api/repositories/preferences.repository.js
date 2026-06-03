import { db } from '../../config/database.js';
import logger from '../../config/logger.js';
import { CustomError, isCustomError, mapSequelizeError } from '../utils/common.js';

const save = async (payload, options = {}) => {
    try {
        logger('info', `Saving preferences for user ${JSON.stringify(payload)}`);
        return await db.preferences.create(payload, options);
    } catch (error) {
        const err = error?.errors?.[0]?.message;
        logger('error', `Error occurred while saving preferences: ${err || error.message}`);
        if (isCustomError(error)) {
            throw error;
        }
        throw mapSequelizeError(error);
    }
};

const update = async (options, data) => {
    try {
        logger('debug', 'Updating preferences data with options:', { options }, 'and data:', { data });
        return await db.preferences.update(data, options);
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', 'Error while updating preferences data', { error: err || error.message });
        throw CustomError(error.code, err || error.message);
    }
};

export default { save, update };
