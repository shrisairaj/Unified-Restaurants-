import logger from '../../config/logger.js';
import adminService from '../services/admin.service.js';
import { STATUS_CODE } from '../utils/common.js';

const dashboard = async (req, res) => {
    try {
        const result = await adminService.dashboard();
        logger('info', 'Admin dashboard data fetched successfully', { result });
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error occurred during admin dashboard fetch', { error });
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: error.message });
    }
};

const owners = async (req, res) => {
    try {
        const result = await adminService.listOwners(req.query);
        logger('info', 'Admin owners list fetched successfully', { result });
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error occurred while fetching admin owners list', { error });
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: error.message });
    }
};

const ownerDetail = async (req, res) => {
    try {
        const result = await adminService.getOwnerDetail(req.params.id);
        logger('info', 'Admin owner detail fetched successfully', { result });
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error occurred while fetching admin owner detail', { error });
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: error.message });
    }
};

const revenue = async (req, res) => {
    try {
        const result = await adminService.revenue();
        logger('info', 'Admin revenue analytics fetched successfully', { result });
        return res.status(STATUS_CODE.OK).send(result);
    } catch (error) {
        logger('error', 'Error occurred while fetching admin revenue analytics', { error });
        return res.status(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: error.message });
    }
};

export default {
    dashboard,
    owners,
    ownerDetail,
    revenue
};
