import moment from 'moment';
import { Op, Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import logger from '../../config/logger.js';
import { ORDER_STATUS } from '../models/order.model.js';
import { USER_ROLES } from '../models/user.model.js';
import categoryRepo from '../repositories/category.repository.js';
import customerRepo from '../repositories/customer.repository.js';
import hotelRepo from '../repositories/hotel.repository.js';
import hotelUserRelationRepo from '../repositories/hotelUserRelation.repository.js';
import menuRepo from '../repositories/menu.repository.js';
import orderRepo from '../repositories/order.repository.js';
import subscriptionRepo from '../repositories/subscription.repository.js';
import tableRepo from '../repositories/table.repository.js';
import { CustomError, STATUS_CODE } from '../utils/common.js';

const create = async (payload, ownerId) => {
    try {
        logger('debug', 'Creating a new hotel with payload:', { payload, ownerId });

        const maxHotels = 10;
        const ownerHotels = await hotelUserRelationRepo.find({
            where: { userId: ownerId }
        });

        if (ownerHotels.count >= maxHotels) {
            logger('error', 'Max limit for hotel creations reached', { ownerId });
            throw CustomError(
                STATUS_CODE.TOO_MANY_REQUEST,
                `You've reached the maximum limit for hotel creations. Only 10 hotels per user allowed.`
            );
        }

        // Creating a new hotel object with provided payload
        const hotel = {
            id: uuidv4(),
            name: payload.name,
            address: payload.address,
            careNumber: payload.careNumber,
            openTime: payload.openTime,
            closeTime: payload.closeTime
        }; // Saving the hotel data

        logger('debug', 'Save hotel with details', { hotel });
        const data = await hotelRepo.save(hotel);

        // Creating a relation between the owner and the hotel
        const ownerRelation = {
            id: uuidv4(),
            hotelId: data.id,
            userId: ownerId
        };

        logger('debug', 'Create Owner and hotel relation', { ownerRelation });
        await hotelUserRelationRepo.save([ownerRelation]);

        let manager;
        // Creating a relation between the manager and the hotel
        if (payload.manager && payload.manager.length) {
            const managerRelation = payload.manager.map((item) => ({
                id: uuidv4(),
                hotelId: data.id,
                userId: item
            }));
            logger('debug', 'Create Managers and hotel relation', { managerRelation });
            await hotelUserRelationRepo.save(managerRelation).catch((err) => {
                manager = { code: err.code, message: err.message };
            });
        }

        const result = JSON.parse(JSON.stringify(data, null, 4));
        if (manager) result.manager = { ...manager };

        return result;
    } catch (error) {
        logger('error', 'Error while creating hotel', { error });
        throw CustomError(error.code, error.message);
    }
};

const update = async (payload, id) => {
    try {
        const { manager, ...rest } = payload;
        logger('debug', 'Updating hotel with ID:', { id, payload });
        const data = await hotelRepo.update({ id }, rest);

        if (manager?.removed?.length) {
            const options = {
                where: {
                    hotelId: id,
                    userId: {
                        [Op.in]: manager.removed
                    }
                }
            };
            await hotelUserRelationRepo.remove(options);
        }

        if (manager?.added?.length) {
            const managerRelation = manager.added.map((item) => ({
                id: uuidv4(),
                hotelId: id,
                userId: item
            }));
            await hotelUserRelationRepo.save(managerRelation);
        }

        return { message: data ? 'Hotel details updated successfully' : ' Failed to update hotel details' };
    } catch (error) {
        logger('error', 'Error while updating hotel', { error });
        throw CustomError(error.code, error.message);
    }
};

const list = async (userId) => {
    try {
        const options = {
            where: { userId },
            include: [
                {
                    model: db.hotel,
                    include: [
                        {
                            model: db.hotelUserRelation,
                            where: { userId: { [Op.ne]: userId } },
                            include: [
                                {
                                    model: db.users,
                                    attributes: ['id', 'firstName', 'lastName']
                                }
                            ],
                            separate: true
                        },
                        {
                            model: db.subscriptions,
                            attributes: ['subscriptionId', 'endDate', 'planName']
                        }
                    ]
                }
            ]
        };
        logger('debug', 'Fetching hotels for user', { options });
        const hotels = await hotelUserRelationRepo.find(options);

        logger('info', `Hotels of owner ${JSON.stringify(hotels)}`);

        const hotelIds = hotels.rows.map(({ hotel }) => hotel.id);
        let salesByHotelId = {};

        if (hotelIds.length) {
            const salesRows = await orderRepo.findSalesByHotelIds(hotelIds);

            salesByHotelId = salesRows.reduce((acc, row) => {
                acc[row.hotelId] = Number(row.sales) || 0;
                return acc;
            }, {});
        }

        const rows = hotels.rows.reduce((cur, next) => {
            const { hotel } = next;
            const obj = {
                id: hotel.id,
                name: hotel.name,
                openTime: hotel.openTime,
                closeTime: hotel.closeTime,
                address: hotel.address,
                careNumber: hotel.careNumber,
                rating: hotel.rating,
                sales: salesByHotelId[hotel.id] || 0,
                assignedManager: null,
                createdAt: hotel.createdAt,
                managers: {},
                subscriptions: hotel.subscription
            };

            if (hotel.hotelUserRelations && hotel.hotelUserRelations.length) {
                const managers = hotel.hotelUserRelations.map((item) => ({
                    id: item.user.id,
                    name: `${item.user.firstName} ${item.user.lastName}`.trim()
                }));
                obj.managers = managers;
                obj.assignedManager = managers[0]?.name || null;
            }
            cur.push(obj);
            return cur;
        }, []);

        const data = { count: hotels.count, rows };
        return data;
    } catch (error) {
        logger('error', 'Error while listing hotels', { error });
        throw CustomError(error.code, error.message);
    }
};

const remove = async (hotelId) => {
    try {
        // Remove tables
        const options = { where: { hotelId } };
        await tableRepo.remove(options);
        logger('debug', `HotelId-${hotelId} - Tables removed successfully`);

        // remove customers
        const customerOptions = {
            ...options,
            attributes: ['id']
        };
        const { rows: customers } = await customerRepo.find(customerOptions);
        const customerIds = customers.map((item) => item.id);
        await customerRepo.remove(options);
        logger('debug', `HotelId-${hotelId} - Customer removed successfully`);

        if (customerIds.length) {
            // Remove Order
            const orderOptions = {
                where: { [Op.in]: customerIds }
            };
            await orderRepo.remove(orderOptions);
            logger('debug', `HotelId-${hotelId} - Orders removed successfully`);
        }

        // Remove Category
        await categoryRepo.remove(options);
        logger('debug', `HotelId-${hotelId} - Categories removed successfully`);

        // Remove Menu
        await menuRepo.remove(options);
        logger('debug', `HotelId-${hotelId} - Menus removed successfully`);

        // remove manager and owner ralation with hotel
        await hotelUserRelationRepo.remove(options);
        logger('debug', `HotelId-${hotelId} - Manager removed successfully`);

        // Remove subscriptoins
        await subscriptionRepo.remove(options);
        logger('debug', `HotelId-${hotelId} - Subscriptions removed successfully`);

        // Remove hotel
        const hotelOptions = { where: { id: hotelId } };
        await hotelRepo.remove(hotelOptions);
        logger('debug', `HotelId-${hotelId} - Hotel removed successfully`);

        return { message: `Hotel removed successfully` };
    } catch (error) {
        logger('error', 'Error while removing hotel', { hotelId, error });
        throw CustomError(error.code, error.message);
    }
};

const dashboard = async (hotelId, user) => {
    try {
        const hotelOptions = {
            where: { id: hotelId },
            attributes: ['id', 'name', 'openTime', 'closeTime', 'address', 'careNumber']
        };

        const hotel = await hotelRepo.find(hotelOptions);
        logger('debug', 'Hotel details are', hotel);

        const countOptions = {
            where: { hotelId }
        };
        const { rows: customers, count: customerCount } = await customerRepo.find(countOptions);
        logger('debug', 'Customer count for hotel', customerCount);

        const managerCount = await hotelUserRelationRepo.count(countOptions);
        logger('debug', 'Manager count for hotel', managerCount);

        const tableCount = await tableRepo.count(countOptions);
        logger('debug', 'Table count for hotel', tableCount);

        const totalRevenueOptions = {
            where: {
                customerId: {
                    [Op.in]: customers.map((item) => item.id)
                },
                status: ORDER_STATUS[3]
            }
        };
        logger('debug', 'Options to get total revenue', totalRevenueOptions);
        const totalPrice = await orderRepo.sum('finalAmount', totalRevenueOptions);

        const menuCount = await menuRepo.count(countOptions);
        logger('debug', 'Menu items count', menuCount);

        /* weekly data start */
        const startOfWeek = moment().startOf('week').toISOString();
        const endOfWeek = moment().endOf('week').toISOString();
        const weeklyOptions = {
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('SUM', Sequelize.col('finalAmount')), 'totalPrice']
            ],
            where: {
                customerId: {
                    [Op.in]: customers.map((item) => item.id)
                },
                status: ORDER_STATUS[3],
                createdAt: {
                    [Op.between]: [startOfWeek, endOfWeek]
                }
            },
            order: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            raw: true
        };
        logger('debug', 'Options to get week data', weeklyOptions);
        const { rows: weekData } = await orderRepo.find(weeklyOptions);
        const weeklyData = {
            week: 0,
            today: 0,
            data: {}
        };
        weekData.forEach((item) => {
            weeklyData.week += Number(item.totalPrice);
            if (moment(item.date).isSame(moment(), 'day')) {
                weeklyData.today = Number(item.totalPrice);
            }
            weeklyData.data[moment(item.date).format('DD')] = item.totalPrice;
        });
        /* weekly data end */

        /* monthly data start */
        const startOfYear = moment().startOf('year').toISOString();
        const endOfYear = moment().endOf('year').toISOString();
        const monthlyOptions = {
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m'), 'month'],
                [Sequelize.fn('SUM', Sequelize.col('finalAmount')), 'totalPrice']
            ],
            where: {
                customerId: {
                    [Op.in]: customers.map((item) => item.id)
                },
                status: ORDER_STATUS[3],
                createdAt: {
                    [Op.between]: [startOfYear, endOfYear]
                }
            },
            order: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m')],
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m')],
            raw: true
        };
        logger('debug', 'Options to get month wise data', monthlyOptions);
        const { rows: monthData } = await orderRepo.find(monthlyOptions);
        const monthlyData = {
            year: 0,
            data: {}
        };
        monthData.forEach((item) => {
            monthlyData.year += Number(item.totalPrice);
            monthlyData.data[moment(item.month).format('MMM')] = item.totalPrice;
        });
        /* monthly data start */

        const topMenuOptions = {
            attributes: [
                [Sequelize.col('menu.name'), 'menuName'],
                [Sequelize.fn('SUM', Sequelize.col('orders.quantity')), 'totalQuantity'],
                [Sequelize.fn('SUM', Sequelize.col('orders.finalAmount')), 'totalPrice']
            ],
            where: {
                customerId: {
                    [Op.in]: customers.map((item) => item.id)
                },
                status: ORDER_STATUS[3]
            },
            include: [
                {
                    model: db.menu,
                    attributes: [],
                    required: true
                }
            ],
            group: ['orders.menuId', 'menu.name'],
            order: [[Sequelize.literal('totalQuantity'), 'DESC']],
            limit: 5,
            raw: true
        };
        const { rows: menus } = await orderRepo.find(topMenuOptions);
        const top5 = menus.reduce((cur, next) => {
            cur[next.menuName] = {
                quantity: Number(next.totalQuantity) || 0,
                revenue: Number(next.totalPrice) || 0
            };
            return cur;
        }, {});

        const result = {
            hotel,
            cardsData: {
                orders: customerCount,
                managers: managerCount - 1,
                tables: tableCount,
                sale: totalPrice,
                menu: menuCount
            },
            weeklyData,
            monthlyData,
            top5
        };

        if (user.role !== USER_ROLES[0]) {
            delete result.cardsData.managers;
        }
        return result;
    } catch (error) {
        logger('error', 'Error while fetching dashboard data for hotel', { hotelId, error });
        throw CustomError(error.code, error.message);
    }
};

const revenue = async (ownerId) => {
    try {
        const ownerHotels = await hotelUserRelationRepo.find({
            where: { userId: ownerId },
            include: [
                {
                    model: db.hotel,
                    attributes: ['id', 'name']
                }
            ]
        });

        const hotels = ownerHotels.rows.map(({ hotel }) => ({ id: hotel.id, name: hotel.name }));
        const hotelIds = hotels.map((item) => item.id);

        const emptyResponse = {
            summary: { today: 0, week: 0, month: 0, year: 0 },
            weeklyTrend: {},
            monthlyTrend: {},
            hotelBreakdown: hotels.map((item) => ({ hotelId: item.id, hotelName: item.name, revenue: 0 }))
        };

        if (!hotelIds.length) {
            return emptyResponse;
        }

        const { rows: customers } = await customerRepo.find({
            where: { hotelId: { [Op.in]: hotelIds } },
            attributes: ['id']
        });
        const customerIds = customers.map((item) => item.id);

        if (!customerIds.length) {
            return emptyResponse;
        }

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
            orderRepo.sumRevenueByCustomerIds(customerIds, todayRange),
            orderRepo.sumRevenueByCustomerIds(customerIds, weekRange),
            orderRepo.sumRevenueByCustomerIds(customerIds, monthRange),
            orderRepo.sumRevenueByCustomerIds(customerIds, yearRange)
        ]);

        const weeklyOptions = {
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('SUM', Sequelize.col('finalAmount')), 'totalPrice']
            ],
            where: {
                customerId: { [Op.in]: customerIds },
                status: ORDER_STATUS[3],
                createdAt: { [Op.between]: [weekRange.start, weekRange.end] }
            },
            order: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            raw: true
        };
        const { rows: weekData } = await orderRepo.find(weeklyOptions);
        const weeklyTrend = weekData.reduce((acc, item) => {
            acc[moment(item.date).format('DD')] = Number(item.totalPrice) || 0;
            return acc;
        }, {});

        const monthlyOptions = {
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m'), 'month'],
                [Sequelize.fn('SUM', Sequelize.col('finalAmount')), 'totalPrice']
            ],
            where: {
                customerId: { [Op.in]: customerIds },
                status: ORDER_STATUS[3],
                createdAt: { [Op.between]: [yearRange.start, yearRange.end] }
            },
            order: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m')],
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), '%Y-%m')],
            raw: true
        };
        const { rows: monthData } = await orderRepo.find(monthlyOptions);
        const monthlyTrend = monthData.reduce((acc, item) => {
            acc[moment(item.month).format('MMM')] = Number(item.totalPrice) || 0;
            return acc;
        }, {});

        const salesRows = await orderRepo.findSalesByHotelIds(hotelIds);
        const salesByHotelId = salesRows.reduce((acc, row) => {
            acc[row.hotelId] = Number(row.sales) || 0;
            return acc;
        }, {});

        const hotelBreakdown = hotels.map((item) => ({
            hotelId: item.id,
            hotelName: item.name,
            revenue: salesByHotelId[item.id] || 0
        }));

        return {
            summary: { today, week, month, year },
            weeklyTrend,
            monthlyTrend,
            hotelBreakdown
        };
    } catch (error) {
        logger('error', 'Error while fetching owner revenue analytics', { ownerId, error });
        throw CustomError(error.code, error.message);
    }
};

export default {
    create,
    update,
    list,
    remove,
    dashboard,
    revenue
};
