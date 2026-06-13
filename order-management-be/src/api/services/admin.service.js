import { Op, Sequelize } from 'sequelize';
import moment from 'moment';
import { db } from '../../config/database.js';
import logger from '../../config/logger.js';
import { ORDER_STATUS } from '../models/order.model.js';
import { USER_ROLES } from '../models/user.model.js';
import { CustomError, STATUS_CODE } from '../utils/common.js';
import orderRepo from '../repositories/order.repository.js';
import userRepo from '../repositories/user.repository.js';

const sanitizeOwner = (owner) => {
    const hotels = (owner.hotelUserRelations || []).map((relation) => relation.hotel).filter(Boolean);
    return {
        id: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        phoneNumber: owner.phoneNumber,
        status: owner.status,
        role: owner.role,
        createdAt: owner.createdAt,
        hotels,
        hotelCount: hotels.length
    };
};

const dashboard = async () => {
    try {
        const [ownerCount, managerCount, hotelCount, revenue] = await Promise.all([
            db.users.count({ where: { role: USER_ROLES[0] } }),
            db.users.count({ where: { role: USER_ROLES[1] } }),
            db.hotel.count(),
            db.orders.sum('finalAmount', { where: { status: ORDER_STATUS[3] } })
        ]);

        return {
            ownerCount,
            managerCount,
            hotelCount,
            revenue: Number(revenue) || 0
        };
    } catch (error) {
        logger('error', 'Error while fetching admin dashboard data', { error });
        throw CustomError(error.code, error.message);
    }
};

const listOwners = async (query = {}) => {
    try {
        const options = {
            where: {
                role: USER_ROLES[0]
            },
            include: [
                {
                    model: db.hotelUserRelation,
                    attributes: ['hotelId'],
                    include: [
                        {
                            model: db.hotel,
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        };

        if (query.search) {
            options.where[Op.or] = [
                { firstName: { [Op.like]: `%${query.search}%` } },
                { lastName: { [Op.like]: `%${query.search}%` } },
                { email: { [Op.like]: `%${query.search}%` } },
                { phoneNumber: { [Op.like]: `%${query.search}%` } }
            ];
        }

        const result = await userRepo.find(options);
        const rows = result.rows.map(sanitizeOwner);
        return { rows, count: result.count };
    } catch (error) {
        logger('error', 'Error while fetching admin owners list', { error });
        throw CustomError(error.code, error.message);
    }
};

const getOwnerDetail = async (ownerId) => {
    try {
        const owner = await userRepo.findOne({
            where: {
                id: ownerId,
                role: USER_ROLES[0]
            },
            include: [
                {
                    model: db.hotelUserRelation,
                    include: [
                        {
                            model: db.hotel,
                            attributes: ['id', 'name', 'address']
                        }
                    ]
                }
            ]
        });

        if (!owner) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Owner not found');
        }

        return sanitizeOwner(owner);
    } catch (error) {
        logger('error', 'Error while fetching admin owner details', { ownerId, error });
        throw CustomError(error.code, error.message);
    }
};

const revenue = async () => {
    try {
        const todayRange = {
            start: moment().startOf('day').toISOString(),
            end: moment().endOf('day').toISOString()
        };
        const weekRange = {
            start: moment().startOf('week').toISOString(),
            end: moment().endOf('week').toISOString()
        };
        const monthRange = {
            start: moment().startOf('month').toISOString(),
            end: moment().endOf('month').toISOString()
        };
        const yearRange = {
            start: moment().startOf('year').toISOString(),
            end: moment().endOf('year').toISOString()
        };

        const [today, week, month, year] = await Promise.all([
            db.orders.sum('finalAmount', {
                where: {
                    status: ORDER_STATUS[3],
                    createdAt: {
                        [Op.between]: [todayRange.start, todayRange.end]
                    }
                }
            }),
            db.orders.sum('finalAmount', {
                where: {
                    status: ORDER_STATUS[3],
                    createdAt: {
                        [Op.between]: [weekRange.start, weekRange.end]
                    }
                }
            }),
            db.orders.sum('finalAmount', {
                where: {
                    status: ORDER_STATUS[3],
                    createdAt: {
                        [Op.between]: [monthRange.start, monthRange.end]
                    }
                }
            }),
            db.orders.sum('finalAmount', {
                where: {
                    status: ORDER_STATUS[3],
                    createdAt: {
                        [Op.between]: [yearRange.start, yearRange.end]
                    }
                }
            })
        ]);

        const weeklyOptions = {
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('SUM', Sequelize.col('finalAmount')), 'totalPrice']
            ],
            where: {
                status: ORDER_STATUS[3],
                createdAt: { [Op.between]: [weekRange.start, weekRange.end] }
            },
            order: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            raw: true
        };

        const monthlyOptions = {
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m'), 'month'],
                [Sequelize.fn('SUM', Sequelize.col('finalAmount')), 'totalPrice']
            ],
            where: {
                status: ORDER_STATUS[3],
                createdAt: { [Op.between]: [yearRange.start, yearRange.end] }
            },
            order: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m')],
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m')],
            raw: true
        };

        const [weeklyRows, monthlyRows] = await Promise.all([
            orderRepo.find(weeklyOptions),
            orderRepo.find(monthlyOptions)
        ]);

        const weeklyTrend = weeklyRows.rows.reduce((acc, item) => {
            acc[moment(item.date).format('DD')] = Number(item.totalPrice) || 0;
            return acc;
        }, {});

        const monthlyTrend = monthlyRows.rows.reduce((acc, item) => {
            acc[moment(item.month).format('MMM')] = Number(item.totalPrice) || 0;
            return acc;
        }, {});

        const hotelRows = await db.hotel.findAll({ attributes: ['id', 'name'] });
        const hotelIds = hotelRows.map((hotel) => hotel.id);

        const salesRows = hotelIds.length ? await orderRepo.findSalesByHotelIds(hotelIds) : [];
        const salesByHotelId = salesRows.reduce((acc, row) => {
            acc[row.hotelId] = Number(row.sales) || 0;
            return acc;
        }, {});

        const hotelBreakdown = hotelRows.map((hotel) => ({
            hotelId: hotel.id,
            hotelName: hotel.name,
            revenue: salesByHotelId[hotel.id] || 0
        }));

        return {
            summary: {
                today: Number(today) || 0,
                week: Number(week) || 0,
                month: Number(month) || 0,
                year: Number(year) || 0
            },
            weeklyTrend,
            monthlyTrend,
            hotelBreakdown
        };
    } catch (error) {
        logger('error', 'Error while fetching admin revenue analytics', { error });
        throw CustomError(error.code, error.message);
    }
};

export default {
    dashboard,
    listOwners,
    getOwnerDetail,
    revenue
};
