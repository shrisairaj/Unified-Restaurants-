import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import logger from '../../config/logger.js';
import { MENU_STATUS } from '../models/menu.model.js';
import { ORDER_STATUS } from '../models/order.model.js';
import { TABLE_STATUS } from '../models/table.model.js';
import { USER_ROLES } from '../models/user.model.js';
import customerRepo from '../repositories/customer.repository.js';
import hotelRepo from '../repositories/hotel.repository.js';
import hotelUserRelationRepo from '../repositories/hotelUserRelation.repository.js';
import orderRepo from '../repositories/order.repository.js';
import tableRepo from '../repositories/table.repository.js';
import { CustomError, NOTIFICATION_ACTIONS, STATUS_CODE, calculateBill } from '../utils/common.js';
import { createInvoicePdf } from '../utils/pdfGenerator.js';
import notificationService from './notification.service.js';

const getNotificationUserIds = async (hotelId) => {
    const notificationOptions = {
        where: { hotelId }
    };
    const { rows } = await hotelUserRelationRepo.find(notificationOptions);
    const userIds = rows.map(({ userId }) => userId);
    logger('debug', 'user ids for notification', userIds);

    return userIds;
};

const register = async (payload) => {
    try {
        logger('debug', `Registering a customer with payload: ${JSON.stringify(payload)}`);
        const customer = {
            id: uuidv4(),
            ...payload
        };

        logger('debug', `Save customer with details ${JSON.stringify(customer)}`);
        const data = await customerRepo.save(customer);

        const tableOptions = {
            options: { where: { id: payload.tableId } },
            data: { status: TABLE_STATUS[1], customerId: data.id }
        };
        logger('debug', `Updating table status with `, tableOptions);
        await tableRepo.update(tableOptions.options, tableOptions.data);

        await notificationService.subscribe({
            customerId: customer.id,
            endpoint: payload.subscription.endpoint,
            expirationTime: payload.subscription.expirationTime,
            keys: {
                p256dh: payload.subscription.keys.p256dh,
                auth: payload.subscription.keys.auth
            }
        });

        const userIds = await getNotificationUserIds(payload.hotelId);
        await notificationService.sendNotification(userIds, {
            title: `Table-${payload.tableNumber} Booked`,
            message: `Table-${payload.tableNumber} is booked. Please assist the customer accordingly.`,
            path: 'orders',
            meta: {
                action: NOTIFICATION_ACTIONS.CUSTOMER_REGISTERATION,
                hotelId: payload.hotelId
            }
        });

        return data;
    } catch (error) {
        logger('error', `Error while creating customer ${JSON.stringify({ error })}`);
        throw CustomError(error.code, error.message);
    }
};

const getTableDetails = async (id) => {
    try {
        const options = {
            where: { id },
            attributes: ['id', 'tableNumber', 'status'],
            include: [
                {
                    model: db.customer,
                    attributes: ['id', 'name', 'phoneNumber']
                },
                {
                    model: db.hotel,
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: db.hotelUserRelation,
                            attributes: ['userId'],
                            include: [
                                {
                                    model: db.users,
                                    where: { role: USER_ROLES[0] },
                                    attributes: ['id'],
                                    include: [
                                        {
                                            model: db.preferences,
                                            attributes: ['payment']
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: db.subscriptions,
                            attributes: ['subscriptionId', 'endDate']
                        }
                    ]
                }
            ]
        };
        const table = await tableRepo.findOne(options);
        logger('debug', `table details ${JSON.stringify(table)}`);
        if (!table) {
            logger('error', `Table not found for id ${id}`);
            throw CustomError(STATUS_CODE.NOT_FOUND, `Table not found for id ${id}`);
        }

        const result = {
            customer: table.customer,
            id: table.id,
            status: table.status,
            tableNumber: table.tableNumber,
            hotel: {
                id: table.hotel?.id,
                name: table.hotel?.name,
                payment: table.hotel?.hotelUserRelations[0]?.user?.preference?.payment
            }
        };
        logger('debug', `table details ${JSON.stringify(result)}`);
        return result;
    } catch (error) {
        logger('error', `Error while fetching table by id ${JSON.stringify(error)}`);
        throw CustomError(error.code, error.message);
    }
};

const getMenuCardFormatData = ({ id, name, categories }) => {
    const types = {
        cover: 'COVER',
        category: 'CATEGORY',
        item: 'MENU_ITEM'
    };

    const typeData = {
        cover: [{ name, id }],
        category: [],
        menuData: {}
    };

    const orders = {};
    const hotelCategories = categories || [];
    hotelCategories.forEach(({ id: categoryId, name, menus }) => {
        typeData.category.push({
            name,
            id: categoryId
        });

        const menuItemData = [];
        const categoryMenus = menus || [];
        categoryMenus.forEach((item) => {
            menuItemData.push({
                name: item.name,
                id: item.id,
                price: item.price
            });
            if (item.orders && item.orders[0]) {
                const order = item.orders[0];
                orders[item.id] = {
                    id: item.id,
                    name: item.name,
                    price: order.price,
                    quantity: order.quantity,
                    status: order.status
                };
            }
        });
        typeData.menuData = {
            ...typeData.menuData,
            [`${categoryId}_${name}`]: menuItemData
        };
    });

    const data = {};
    let page = 0;
    data[page] = { type: types.cover, data: typeData.cover[0] };
    page++;

    // Add categories in the menu card details page wise
    const categoriesPerPage = 10;
    const categoriesCount = Math.ceil(typeData.category.length / categoriesPerPage);
    for (let index = page; index < page + categoriesCount; index++) {
        data[index] = {
            title: 'Categories',
            type: types.category,
            data: typeData.category.splice(0, categoriesPerPage)
        };
    }
    page += categoriesCount;

    // add menu items in the menu card details page wise
    const mapping = {};
    const menusPerPage = 8;
    Object.keys(typeData.menuData).forEach((key) => {
        const id = key.split('_')[0];
        const name = key.split('_')[1];
        mapping[id] = page;
        const menuCount = Math.ceil(typeData.menuData[key].length / menusPerPage);
        const menus = typeData.menuData[key];
        for (let index = page; index < page + menuCount; index++) {
            data[index] = { title: name, type: types.item, data: menus.splice(0, menusPerPage) };
        }
        page += menuCount;
    });

    return { data, mapping, orders };
};

const getMenuDetails = async (hotelId, customerId) => {
    try {
        const options = {
            where: { id: hotelId },
            attributes: ['id', 'name'],
            include: [
                {
                    model: db.categories,
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: db.menu,
                            where: { status: MENU_STATUS[0] },
                            attributes: ['id', 'name', 'price']
                        }
                    ]
                }
            ],
            order: [[db.categories, 'order', 'ASC']]
        };
        logger('debug', 'Fetching hotels details');

        const res = await hotelRepo.find(options);
        if (!res) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Hotel not found');
        }
        const { data: formatedData, mapping, orders } = getMenuCardFormatData(res);

        return {
            id: res.id,
            name: res.name,
            count: Object.keys(formatedData).length,
            data: formatedData,
            mapping,
            orders
        };
    } catch (error) {
        logger('error', 'Error while getting hotel details', { error });
        throw CustomError(error.code, error.message);
    }
};

const placeOrder = async (payload) => {
    try {
        const { customerId, menus, hotelId, tableId } = payload;
        const tipAmount = Math.max(0, Number(payload.tipAmount) || 0);

        // Find all orders for this customer to determine the next edited version
        const previousOrders = {
            where: {
                customerId
            }
        };
        const { rows: orders } = await orderRepo.find(previousOrders);
        let edited = 0;
        orders.forEach((next) => {
            edited = Math.max(edited, next.edited);
        });
        edited++;

        const subtotal = menus.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
        const { sgst, cgst, totalPrice } = calculateBill(subtotal, tipAmount);

        // Generate orderNumber once
        const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

        // Add completely new fresh orders for each menu item in this checkout/placement
        const data = [];
        menus.forEach(({ menuId, menuName, quantity, price }) => {
            if (!quantity) return;
            const isFirstItem = data.length === 0;
            data.push({
                id: uuidv4(),
                menuId,
                customerId,
                hotelId,
                tableId,
                price: price * quantity,
                quantity,
                status: ORDER_STATUS[0],
                description: `${edited}-ADD:Incoming order: ${quantity} x ${menuName}. Let's get cooking!`,
                edited,
                orderNumber,
                razorpayOrderId: payload.razorpayOrderId || null,
                razorpayPaymentId: payload.razorpayPaymentId || null,
                subtotalAmount: isFirstItem ? subtotal : 0,
                cgstAmount: isFirstItem ? cgst : 0,
                sgstAmount: isFirstItem ? sgst : 0,
                tipAmount: isFirstItem ? tipAmount : 0,
                finalAmount: isFirstItem ? totalPrice : 0
            });
        });

        const res = await orderRepo.save(data);
        logger('info', 'order operations successful', res);

        const userIds = await getNotificationUserIds(hotelId);
        await notificationService.sendNotification(userIds, {
            title: `Order Updates`,
            message: `Table-${payload.tableNumber} order is placed / updated.`,
            path: 'orders',
            meta: {
                action: NOTIFICATION_ACTIONS.ORDER_PLACEMENT,
                tableId: payload.tableId,
                orderNumber,
                tableNumber: payload.tableNumber,
                totalAmount: totalPrice,
                hotelId
            }
        });

        const orderedItems = menus
            .filter((menu) => Number(menu.quantity) > 0)
            .map((menu) => ({
                id: menu.menuId,
                name: menu.menuName,
                quantity: Number(menu.quantity),
                unitPrice: Number(menu.price),
                totalPrice: Number(menu.price) * Number(menu.quantity)
            }));

        const orderId = `${customerId}-${edited}`;
        const orderDateTime = new Date().toISOString();

        const hotel = await hotelRepo.find({
            where: { id: hotelId },
            attributes: ['id', 'name']
        });

        const invoiceTableData = [['Item', 'Quantity', 'Price']];
        orderedItems.forEach((item) => {
            invoiceTableData.push([item.name, String(item.quantity), String(item.totalPrice)]);
        });
        invoiceTableData.push(['', 'Tip', String(tipAmount)]);
        invoiceTableData.push(['', 'SGST', String(sgst)]);
        invoiceTableData.push(['', 'CGST', String(cgst)]);
        invoiceTableData.push(['', 'Total', String(totalPrice)]);

        const invoicePdfBytes = await createInvoicePdf({
            title: hotel?.name || 'Invoice',
            hotelId: hotel?.id || hotelId,
            invoiceNumber: orderNumber,
            orderId: orderId,
            date: orderDateTime ? new Date(orderDateTime).toLocaleString() : new Date().toLocaleString(),
            tableNumber: String(payload.tableNumber),
            tableData: invoiceTableData,
            totalAmount: String(totalPrice),
            paymentMode: payload.razorpayPaymentId ? 'ONLINE' : 'PENDING',
            razorpayPaymentId: payload.razorpayPaymentId || '-'
        });

        return {
            rowsAffected: res.length,
            order: {
                orderNumber,
                orderId,
                orderDateTime,
                hotelName: hotel?.name || '',
                hotelId: hotel?.id || hotelId,
                tableNumber: payload.tableNumber,
                items: orderedItems,
                subtotal,
                tipAmount,
                sgst,
                cgst,
                totalPrice,
                paymentMode: 'PENDING',
                paymentId: '-'
            },
            invoicePdfBase64: Buffer.from(invoicePdfBytes).toString('base64')
        };
    } catch (error) {
        logger('error', 'Error while placing order', error);
        throw CustomError(error.code, error.message);
    }
};

const getOrder = async (customerId) => {
    try {
        const options = {
            where: {
                customerId,
                status: {
                    [Op.in]: [ORDER_STATUS[0], ORDER_STATUS[1]]
                }
            },
            attributes: ['id', 'price', 'quantity', 'status'],
            include: [
                {
                    model: db.menu,
                    attributes: ['id', 'name', 'price']
                }
            ]
        };
        logger('debug', `Get order details for customer ${customerId} with options`, options);
        return await orderRepo.find(options);
    } catch (error) {
        logger('error', 'Error while get order details', { error });
        throw CustomError(error.code, error.message);
    }
};

const feedback = async ({ customerId, feedback, rating }) => {
    try {
        const options = { where: { id: customerId } };
        const data = { feedback, rating };
        logger('debug', 'options and data for customer feedback', { options, data });

        return await customerRepo.update(options, data);
    } catch (error) {
        logger('error', 'Error while get order details', { error });
        throw CustomError(error.code, error.message);
    }
};

const active = async (tableId) => {
    try {
        const options = {
            where: { id: tableId },
            attributes: ['id', 'customerId', 'tableNumber'],
            include: [
                {
                    model: db.customer,
                    attributes: ['id'],
                    include: [
                        {
                            model: db.orders,
	                            where: {
	                                status: {
	                                    [Op.notIn]: [ORDER_STATUS[2], ORDER_STATUS[3]]
	                                }
	                            },
                            attributes: ['id', 'price', 'quantity', 'status', 'edited', 'customerId', 'razorpayPaymentId', 'description', 'updatedAt', 'orderNumber', 'menu'],
                            include: [
                                {
                                    model: db.menu
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        const activeOrders = await tableRepo.findOne(options);
        logger('debug', `active orders for table ${tableId}`, activeOrders);

        if (!activeOrders.customer) {
            logger('info', `No active orders for table ${tableId}`);
            return { message: 'No active orders' };
        }

        const orders = activeOrders.customer?.orders;
        if (!orders.length) {
            logger('info', `Customer has not ordered yet for table ${tableId}`);
            return { message: 'No active orders' };
        }

        const data = orders.reduce(
            (cur, next) => {
                if (!cur.orderTime || new Date(next.updatedAt) > new Date(cur.orderTime)) {
                    cur.orderTime = next.updatedAt;
                    cur.orderId = `${next.customerId}-${next.edited}`;
                    cur.orderNumber = next.orderNumber || `ORD-${next?.createdAt ? new Date(next.createdAt).getTime().toString().slice(-8) : 'XXXX'}`;
                }

                if (next.status === ORDER_STATUS[0]) {
                    cur.bill = false;
                    cur.totalAmount += next.price;
                }

                if (next.status === ORDER_STATUS[0]) {
                    cur.pendingOrder[next.id] = { name: next.menu.name, quantity: next.quantity };
                }

                if (next.status === ORDER_STATUS[1]) {
                    cur.billDetails.menu.push({
                        name: next.menu.name,
                        quantity: next.quantity,
                        price: next.price
                    });
                    cur.billDetails.price += next.price;
                    cur.totalAmount += next.price;
                }

                const descriptions = next.description.split('#');
                descriptions.forEach((des) => {
                    const i = Number(des[0]) - 1;
                    if (!cur.description[i]) cur.description[i] = [];
                    cur.description[i].push({
                        description: des.substring(des.indexOf('-') + 1).trim(),
                        status: next.status
                    });
                });
                return cur;
            },
            {
                bill: true,
                pendingOrder: {},
                billDetails: { menu: [], price: 0 },
                description: [],
                orderId: '',
                orderNumber: '',
                orderTime: '',
                tableNumber: activeOrders.tableNumber,
                orderStatus: ORDER_STATUS[0],
                totalAmount: 0
            }
        );

        if (data.bill) {
            const { cgst, sgst, totalPrice } = calculateBill(data.billDetails.price);
            data.billDetails.sgst = sgst;
            data.billDetails.cgst = cgst;
            data.billDetails.totalPrice = totalPrice;
            data.billDetails.paymentId = orders[0].razorpayPaymentId;
            data.billDetails.orderNumber = orders[0].orderNumber || `ORD-${orders[0]?.createdAt ? new Date(orders[0].createdAt).getTime().toString().slice(-8) : 'XXXX'}`;
            data.orderStatus = ORDER_STATUS[1];
        }
        data.billDetails.id = activeOrders.customer.id;
        logger('debug', `Active order details for table ${tableId}`, data);

        return data;
    } catch (error) {
        logger('error', 'Error while fetching active orders', { error });
        throw CustomError(error.code, error.message);
    }
};

const updatePending = async (orders, customerId) => {
    try {
        const options = {
            where: {
                id: { [Op.in]: orders }
            }
        };
        const data = { status: ORDER_STATUS[1] };
        logger('debug', 'options and data for updating pending orders', { options, data });
        await notificationService.sendNotification(
            undefined,
            {
                title: `Order Served`,
                message: `Order Served !!! Please enjoy the meal.`,
                meta: {
                    action: NOTIFICATION_ACTIONS.ORDER_SERVED
                }
            },
            customerId
        );

        return await orderRepo.update(options, data);
    } catch (error) {
        logger('error', 'Error while get order details', { error });
        throw CustomError(error.code, error.message);
    }
};

const completed = async (hotelId, filters) => {
    try {
        const { limit, skip, sortKey, sortOrder, filterKey, filterValue } = filters;
        const defaults = {
            sortKey: 'updatedAt',
            sortOrder: 'DESC',
            limit: 10,
            offset: 0
        };

        const options = {
            where: { hotelId },
            distinct: true,
            attributes: ['id', 'name'],
            include: [
                {
                    model: db.orders,
                    where: {
                        status: {
                            [Op.in]: [ORDER_STATUS[0], ORDER_STATUS[1], ORDER_STATUS[2], ORDER_STATUS[3]]
                        },
                        quantity: { [Op.gt]: 0 }
                    },
                    attributes: ['id', 'price', 'quantity', 'razorpayPaymentId', 'status', 'edited', 'orderNumber', 'createdAt', 'updatedAt', 'subtotalAmount', 'cgstAmount', 'sgstAmount', 'tipAmount', 'finalAmount'],
                    include: [
                        {
                            model: db.menu,
                            attributes: ['name']
                        },
                        {
                            model: db.tables,
                            attributes: ['tableNumber']
                        }
                    ]
                },
                {
                    model: db.tables,
                    attributes: ['tableNumber'],
                    required: false
                }
            ],
            limit: Number(limit) || defaults.limit,
            offset: Number(skip) || defaults.offset
        };

        if (filterKey && filterValue) {
            const isOrderNumberFilter = filterKey === 'orderNumber';
            const isTableNumberFilter = filterKey === 'tableNumber';
            const isOrderStatusFilter = filterKey === 'orderStatus';

            if (isOrderNumberFilter) {
                options.include[0].where = {
                    ...options.include[0].where,
                    orderNumber: {
                        [Op.like]: `%${filterValue}%`
                    }
                };
            } else if (isTableNumberFilter) {
                const tableNum = Number(filterValue);
                if (!Number.isNaN(tableNum)) {
                    options.include[1].where = { tableNumber: tableNum };
                    options.include[1].required = true;
                }
            } else if (isOrderStatusFilter) {
                options.include[0].where = {
                    ...options.include[0].where,
                    status: {
                        [Op.like]: `%${filterValue}%`
                    }
                };
            } else if (filterKey === 'orderId') {
                const custId = filterValue.split('-')[0];
                options.where = {
                    hotelId,
                    id: {
                        [Op.like]: `%${custId}%`
                    }
                };
            }
        }

        if (sortKey && sortOrder) {
            let orderArray = [];
            if (sortKey === 'tableNumber') {
                orderArray = [[db.tables, 'tableNumber', sortOrder]];
            } else if (sortKey === 'orderStatus') {
                orderArray = [[db.orders, 'status', sortOrder]];
            } else if (sortKey === 'orderTime') {
                orderArray = [[db.orders, 'createdAt', sortOrder]];
            } else if (sortKey === 'orderId') {
                orderArray = [['id', sortOrder]];
            } else if (sortKey === 'orderNumber') {
                orderArray = [[db.orders, 'orderNumber', sortOrder]];
            } else if (sortKey === 'totalPrice') {
                orderArray = [[db.orders, 'finalAmount', sortOrder]];
            } else if (sortKey === 'itemsSummary') {
                orderArray = [[db.orders, 'createdAt', sortOrder]];
            } else {
                orderArray = [[defaults.sortKey, defaults.sortOrder]];
            }
            options.order = orderArray;
        }
        logger('debug', 'Options to fetch completed orders', options);
        const customers = await customerRepo.find(options);

        const data = [];
        customers.rows.forEach((item) => {
            const { orders } = item;

            // Group orders by edited version
            const ordersByVersion = {};
            orders.forEach((menuItem) => {
                const version = menuItem.edited || 0;
                if (!ordersByVersion[version]) {
                    ordersByVersion[version] = [];
                }
                ordersByVersion[version].push(menuItem);
            });

            // Create a separate order object for each version
            Object.keys(ordersByVersion).forEach((version) => {
                const versionOrders = ordersByVersion[version];
                const obj = {
                    id: item.id,
                    name: item.name,
                    menu: []
                };

                let price = 0;
                let tipAmount = 0;
                let storedSgst = null;
                let storedCgst = null;
                let storedFinalAmount = null;
                versionOrders.forEach((menuItem) => {
                    obj.menu.push({
                        name: menuItem.menu.name,
                        price: menuItem.price,
                        quantity: menuItem.quantity
                    });
                    price += menuItem.price;
                    tipAmount += Number(menuItem.tipAmount) || 0;
                    if (menuItem.finalAmount) storedFinalAmount = Number(menuItem.finalAmount);
                    if (menuItem.sgstAmount) storedSgst = Number(menuItem.sgstAmount);
                    if (menuItem.cgstAmount) storedCgst = Number(menuItem.cgstAmount);
                });

                obj.price = price;
                const { cgst, sgst, totalPrice } = calculateBill(price, tipAmount);
                obj.sgst = sgst;
                obj.cgst = cgst;
                obj.tipAmount = tipAmount;
                if (storedSgst !== null) obj.sgst = storedSgst;
                if (storedCgst !== null) obj.cgst = storedCgst;
                obj.totalPrice = storedFinalAmount !== null ? storedFinalAmount : totalPrice;
                obj.paymentId = versionOrders[0]?.razorpayPaymentId || '-';
                obj.orderId = `${item.id}-${version}`;
                obj.orderNumber = versionOrders[0]?.orderNumber || `ORD-${versionOrders[0]?.createdAt ? new Date(versionOrders[0].createdAt).getTime().toString().slice(-8) : 'XXXX'}`;
                obj.orderTime = versionOrders[0]?.createdAt || null;
                obj.orderStatus = versionOrders[0]?.status || ORDER_STATUS[3];
                obj.tableNumber = item.table?.tableNumber || versionOrders[0]?.table?.tableNumber || '-';
                obj.data = { ...obj };
                data.push(obj);
            });
        });
        return { data, count: customers.count };
    } catch (error) {
        logger('error', 'Error while get completed order details', { error });
        throw CustomError(error.code, error.message);
    }
};

const getOrderDetails = async (hotelId, orderId) => {
    try {
        logger('debug', `Fetching order details for orderId: ${orderId}, hotelId: ${hotelId}`);

        const lastDashIndex = orderId.lastIndexOf('-');
        if (lastDashIndex === -1) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }
        const customerId = orderId.substring(0, lastDashIndex);
        const editedVersion = Number(orderId.substring(lastDashIndex + 1));

        const options = {
            where: { id: customerId, hotelId },
            attributes: ['id', 'name', 'phoneNumber', 'email'],
            include: [
                {
                    model: db.orders,
                    where: {
                        customerId,
                        edited: editedVersion,
                        status: {
                            [Op.in]: [ORDER_STATUS[0], ORDER_STATUS[1], ORDER_STATUS[2], ORDER_STATUS[3]]
                        },
                        quantity: { [Op.gt]: 0 }
                    },
                    attributes: ['id', 'price', 'quantity', 'razorpayPaymentId', 'status', 'edited', 'orderNumber', 'createdAt', 'updatedAt', 'menuId', 'subtotalAmount', 'cgstAmount', 'sgstAmount', 'tipAmount', 'finalAmount'],
                    include: [
                        {
                            model: db.menu,
                            attributes: ['id', 'name', 'price']
                        },
                        {
                            model: db.tables,
                            attributes: ['id', 'tableNumber', 'hotelId']
                        }
                    ]
                },
                {
                    model: db.tables,
                    attributes: ['id', 'tableNumber', 'hotelId'],
                    required: false
                }
            ]
        };

        const customer = await customerRepo.findOne(options);

        if (!customer) {
            logger('error', `Order not found for orderId: ${orderId}`);
            throw CustomError(STATUS_CODE.NOT_FOUND, `Order not found`);
        }

        const orders = customer.orders || [];
        let totalPrice = 0;
        let tipAmount = 0;
        let storedSgst = null;
        let storedCgst = null;
        let storedFinalAmount = null;
        const orderedItems = [];

        orders.forEach((order) => {
            orderedItems.push({
                id: order.menuId,
                name: order.menu.name,
                quantity: order.quantity,
                unitPrice: order.menu.price,
                itemPrice: order.price
            });
            totalPrice += order.price;
            tipAmount += Number(order.tipAmount) || 0;
            if (order.finalAmount) storedFinalAmount = Number(order.finalAmount);
            if (order.sgstAmount) storedSgst = Number(order.sgstAmount);
            if (order.cgstAmount) storedCgst = Number(order.cgstAmount);
        });

        const { sgst, cgst, totalPrice: totalAmount } = calculateBill(totalPrice, tipAmount);

        const hotel = await hotelRepo.find({
            where: { id: hotelId },
            attributes: ['name']
        });

        const result = {
            orderId,
            orderNumber: orders[0]?.orderNumber || `ORD-${orders[0]?.createdAt ? new Date(orders[0].createdAt).getTime().toString().slice(-8) : 'XXXX'}`,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phoneNumber,
            customerEmail: customer.email,
            tableNumber: customer.table?.tableNumber || orders[0]?.table?.tableNumber || '-',
            tableId: customer.table?.id || orders[0]?.table?.id || null,
            orderedItems,
            subtotal: totalPrice,
            tipAmount,
            sgst: storedSgst !== null ? storedSgst : sgst,
            cgst: storedCgst !== null ? storedCgst : cgst,
            totalAmount: storedFinalAmount !== null ? storedFinalAmount : totalAmount,
            paymentMode: orders[0]?.razorpayPaymentId ? 'ONLINE' : 'PENDING',
            paymentId: orders[0]?.razorpayPaymentId || '-',
            orderStatus: orders[0]?.status || ORDER_STATUS[0],
            orderDateTime: orders[0]?.createdAt || new Date().toISOString(),
            hotelId,
            hotelName: hotel?.name || ''
        };

        logger('debug', `Order details fetched`, result);
        return result;
    } catch (error) {
        logger('error', `Error while fetching order details`, { error });
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

const updateOrderStatus = async (hotelId, orderId, newStatus) => {
    try {
        logger('debug', `Updating order status for orderId: ${orderId}, hotelId: ${hotelId}, newStatus: ${newStatus}`);

        const lastDashIndex = orderId.lastIndexOf('-');
        if (lastDashIndex === -1) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }
        const customerId = orderId.substring(0, lastDashIndex);
        const editedVersion = Number(orderId.substring(lastDashIndex + 1));

        // Validate the order belongs to this hotel
        const customer = await customerRepo.findOne({
            where: { id: customerId, hotelId },
            attributes: ['id']
        });

        if (!customer) {
            logger('error', `Unauthorized: Order not found for this hotel`);
            throw CustomError(STATUS_CODE.FORBIDDEN, `Unauthorized access to this order`);
        }

        const existingOrders = await orderRepo.find({
            where: {
                customerId,
                edited: editedVersion
            },
            attributes: ['status'],
            limit: 1
        });

        const currentStatus = existingOrders?.rows?.[0]?.status;
        if (!currentStatus) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }

        if (currentStatus === ORDER_STATUS[2] && newStatus === ORDER_STATUS[3]) {
            throw CustomError(STATUS_CODE.BAD_REQUEST, 'Cannot complete a cancelled order');
        }

        // Update all orders for this customer matching this edited version
        const updateOptions = {
            where: {
                customerId,
                edited: editedVersion
            }
        };

        const updateData = { status: newStatus };

        await orderRepo.update(updateOptions, updateData);
        logger('info', `Order status updated successfully`, { orderId, newStatus });

        return { success: true, message: `Order status updated to ${newStatus}` };
    } catch (error) {
        logger('error', `Error while updating order status`, { error });
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

const generateInvoice = async (hotelId, orderId) => {
    try {
        logger('debug', `Generating invoice for orderId: ${orderId}, hotelId: ${hotelId}`);

        const orderDetails = await getOrderDetails(hotelId, orderId);

        const hotel = await hotelRepo.find({
            where: { id: hotelId },
            attributes: ['id', 'name']
        });

        const invoiceTableData = [['Item', 'Quantity', 'Price']];
        orderDetails.orderedItems.forEach((item) => {
            invoiceTableData.push([item.name, String(item.quantity), String(item.itemPrice)]);
        });
        invoiceTableData.push(['', 'Tip', String(orderDetails.tipAmount || 0)]);
        invoiceTableData.push(['', 'SGST', String(orderDetails.sgst)]);
        invoiceTableData.push(['', 'CGST', String(orderDetails.cgst)]);
        invoiceTableData.push(['', 'Total', String(orderDetails.totalAmount)]);

        const invoicePdfBytes = await createInvoicePdf({
            title: hotel?.name || 'Invoice',
            hotelId: hotel?.id || hotelId,
            invoiceNumber: orderDetails.orderNumber,
            orderId: orderDetails.orderId,
            date: orderDetails.orderDateTime ? new Date(orderDetails.orderDateTime).toLocaleString() : new Date().toLocaleString(),
            tableNumber: String(orderDetails.tableNumber),
            tableData: invoiceTableData,
            totalAmount: String(orderDetails.totalAmount),
            paymentMode: orderDetails.paymentMode || 'PENDING',
            razorpayPaymentId: orderDetails.paymentId || '-'
        });

        logger('debug', `Invoice generated successfully`);
        return invoicePdfBytes;
    } catch (error) {
        logger('error', `Error while generating invoice`, { error });
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getOrderStatus = async (orderId) => {
    try {
        logger('debug', `Fetching order status for orderId: ${orderId}`);

        const lastDashIndex = orderId.lastIndexOf('-');
        if (lastDashIndex === -1) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }
        const customerId = orderId.substring(0, lastDashIndex);
        const editedVersion = Number(orderId.substring(lastDashIndex + 1));

        const order = await db.orders.findOne({
            where: {
                customerId,
                edited: editedVersion
            },
            attributes: ['status', 'orderNumber', 'createdAt']
        });

        if (!order) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }

        return {
            orderId,
            orderNumber: order.orderNumber || `ORD-${order?.createdAt ? new Date(order.createdAt).getTime().toString().slice(-8) : 'XXXX'}`,
            status: order.status
        };
    } catch (error) {
        logger('error', `Error while fetching order status`, { error });
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

const getPublicOrderDetails = async (orderId) => {
    try {
        logger('debug', `Fetching public order details for orderId: ${orderId}`);

        const lastDashIndex = orderId.lastIndexOf('-');
        if (lastDashIndex === -1) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }
        const customerId = orderId.substring(0, lastDashIndex);
        const editedVersion = Number(orderId.substring(lastDashIndex + 1));

        const order = await db.orders.findOne({
            where: {
                customerId,
                edited: editedVersion
            },
            attributes: ['hotelId']
        });

        if (!order) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }

        return await getOrderDetails(order.hotelId, orderId);
    } catch (error) {
        logger('error', `Error while fetching public order details`, { error });
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

const resetTable = async (tableId) => {
    try {
        logger('info', `Resetting table status to OPEN for tableId: ${tableId}`);
        const tableOptions = {
            options: { where: { id: tableId } },
            data: { status: TABLE_STATUS[0], customerId: null }
        };
        await tableRepo.update(tableOptions.options, tableOptions.data);
        return { success: true, message: 'Table reset successfully' };
    } catch (error) {
        logger('error', `Error while resetting table`, { error });
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

const cancelOrder = async (orderId) => {
    try {
        logger('debug', `Cancelling order for orderId: ${orderId}`);

        const lastDashIndex = orderId.lastIndexOf('-');
        if (lastDashIndex === -1) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }
        const customerId = orderId.substring(0, lastDashIndex);
        const editedVersion = Number(orderId.substring(lastDashIndex + 1));

        // Get the order to check timing and status
        const order = await db.orders.findOne({
            where: {
                customerId,
                edited: editedVersion
            }
        });

        if (!order) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Order not found');
        }

        // Check if order is in PENDING status only
        if (order.status !== ORDER_STATUS[0]) {
            throw CustomError(STATUS_CODE.BAD_REQUEST, `Cannot cancel order with status ${order.status}`);
        }

        // Check 5-minute cancellation window
        const createdAt = new Date(order.createdAt);
        const now = new Date();
        const minutesDiff = (now - createdAt) / (1000 * 60);

        if (minutesDiff > 5) {
            throw CustomError(STATUS_CODE.BAD_REQUEST, 'Cancellation window (5 minutes) has expired');
        }

        // Update order status to CANCELLED
        await orderRepo.update(
            {
                where: {
                    customerId,
                    edited: editedVersion
                }
            },
            { status: ORDER_STATUS[2] }
        );

        logger('info', `Order ${orderId} cancelled successfully`);

        return { success: true, message: 'Order cancelled successfully' };
    } catch (error) {
        logger('error', `Error while cancelling order`, { error });
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

export default {
    register,
    getTableDetails,
    getMenuDetails,
    placeOrder,
    getOrder,
    feedback,
    active,
    updatePending,
    completed,
    getOrderDetails,
    updateOrderStatus,
    generateInvoice,
    getNotificationUserIds,
    getOrderStatus,
    getPublicOrderDetails,
    resetTable,
    cancelOrder
};
