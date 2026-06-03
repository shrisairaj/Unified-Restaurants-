import { Op, Sequelize } from 'sequelize';
import { db } from '../../config/database.js';
import logger from '../../config/logger.js';
import { ORDER_STATUS } from '../models/order.model.js';
import { CustomError } from '../utils/common.js';

const find = async (options) => {
    try {
        logger('info', `fetching order for customer with options`, options);
        return await db.orders.findAndCountAll(options);
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', `Error occurred while fetching orders`, { error: err || error.message });
        throw CustomError(error.code, err || error.message);
    }
};

const save = async (payload, options = {}) => {
    try {
        logger('info', 'Saving order data to the database', { payload, options });
        return await db.orders.bulkCreate(payload, options);
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', `Error occurred while saving order details: ${err || error.message}`);
        throw CustomError(error.code, err || error.message);
    }
};

const update = async (options, data) => {
    try {
        logger('debug', 'Updating order data options:', { options }, 'and data:', { data });
        return await db.orders.update(data, options);
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', 'Error while updating order', { error: err || error.message });
        throw CustomError(error.code, err || error.message);
    }
};

const sum = async (columnName, options) => {
    try {
        logger('debug', 'Finding sum of orders with options:', { options });
        return await db.orders.sum(columnName, options);
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', 'Error while finding sum of order', { error: err || error.message });
        throw CustomError(error.code, err || error.message);
    }
};

const remove = async (options) => {
    try {
        logger('debug', 'Removing orders from the database');
        return await db.orders.destroy(options);
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', `Error occurred while removing orders data: ${err || error.message}`);
        throw CustomError(error.code, err || error.message);
    }
};

const sumRevenueByCustomerIds = async (customerIds, dateRange) => {
    try {
        if (!customerIds?.length) {
            return 0;
        }

        const where = {
            customerId: { [Op.in]: customerIds },
            status: ORDER_STATUS[3]
        };

        if (dateRange?.start && dateRange?.end) {
            where.createdAt = { [Op.between]: [dateRange.start, dateRange.end] };
        }

        logger('debug', 'Finding revenue sum for customers', { customerIds: customerIds.length, dateRange });
        const total = await db.orders.sum('finalAmount', { where });
        return Number(total) || 0;
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', 'Error while finding revenue sum', { error: err || error.message });
        throw CustomError(error.code, err || error.message);
    }
};

const findSalesByHotelIds = async (hotelIds) => {
    try {
        if (!hotelIds.length) {
            return [];
        }

        logger('debug', 'Finding sales by hotel ids', { hotelIds });
        return await db.orders.findAll({
            attributes: [
                [Sequelize.col('customer.hotelId'), 'hotelId'],
                [Sequelize.fn('SUM', Sequelize.col('orders.finalAmount')), 'sales']
            ],
            include: [
                {
                    model: db.customer,
                    attributes: [],
                    where: { hotelId: { [Op.in]: hotelIds } }
                }
            ],
            where: { status: ORDER_STATUS[3] },
            group: [Sequelize.col('customer.hotelId')],
            raw: true
        });
    } catch (error) {
        const err = error?.errors ? error?.errors[0]?.message : undefined;
        logger('error', 'Error while finding sales by hotel ids', { error: err || error.message });
        throw CustomError(error.code, err || error.message);
    }
};

export default { find, save, update, sum, remove, sumRevenueByCustomerIds, findSalesByHotelIds };
