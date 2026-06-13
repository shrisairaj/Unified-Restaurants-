import { Op, literal } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import logger from '../../config/logger.js';
import { INVITE_STATUS } from '../models/invite.model.js';
import { USER_ROLES, USER_STATUS } from '../models/user.model.js';
import hotelUserRelationRepo from '../repositories/hotelUserRelation.repository.js';
import inviteRepo from '../repositories/invite.repository.js';
import userRepo from '../repositories/user.repository.js';
import { CustomError, STATUS_CODE, TABLES, isCustomError } from '../utils/common.js';

const verifyManagerOwnership = async (managerId, ownerId) => {
    const managerInvite = await inviteRepo.findOne({
        where: {
            userId: managerId,
            ownerId,
            status: INVITE_STATUS[1]
        }
    });

    if (!managerInvite) {
        throw CustomError(STATUS_CODE.NOT_FOUND, 'Manager not found');
    }

    return managerInvite;
};

const fetch = async (payload) => {
    try {
        const { owner, limit, skip, sortKey, sortOrder, filterKey, filterValue } = payload;
        const defaults = {
            sortKey: 'updatedAt',
            sortOrder: 'DESC',
            limit: 10,
            offset: 0
        };

        const options = {
            where: {
                status: INVITE_STATUS[1],
                ownerId: owner
            },
            include: [
                {
                    model: db.users,
                    include: [
                        {
                            model: db.hotelUserRelation,
                            attributes: ['hotelId'],
                            include: [
                                {
                                    model: db.hotel,
                                    attributes: ['id', 'name', 'address']
                                }
                            ],
                            separate: true
                        }
                    ]
                }
            ],
            limit: Number(limit) || defaults.limit,
            offset: Number(skip) || defaults.offset
        };

        const hotelKey = 'hotelName';
        if (sortKey === hotelKey) {
            options.order = [[{ model: db.hotel }, 'name', sortOrder || defaults.sortOrder]];
        }

        if (filterKey === hotelKey && filterValue) {
            options.include[0].include[0].include[0].where = {
                name: {
                    [Op.like]: `%${filterValue}%`
                }
            };
        }

        if (sortKey && sortOrder) {
            options.order = [[{ model: db.users }, sortKey || defaults.sortKey, sortOrder || defaults.sortOrder]];
        }

        if (filterKey && filterValue) {
            options.include[0].where = {
                [filterKey]: {
                    [Op.like]: `%${filterValue}%`
                }
            };
        }

        logger('debug', `Fetching manager with options ${options}`);
        const data = await inviteRepo.find(options);

        logger('debug', `Managers fetched successfully ${data}`);
        const managers = data.rows.reduce((cur, next) => {
            const { user } = next;
            const obj = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                status: user.status,
                createdAt: user.createdAt,
                hotel: {}
            };

            if (user.hotelUserRelations && user.hotelUserRelations.length) {
                obj.hotel = {
                    id: user.hotelUserRelations[0]?.hotel?.id,
                    name: user.hotelUserRelations[0]?.hotel?.name,
                    address: user.hotelUserRelations[0]?.hotel?.address
                };
            }
            cur.push(obj);
            return cur;
        }, []);

        return { count: data.count, rows: managers };
    } catch (error) {
        logger('error', 'Error while fetching managers', { error });
        throw CustomError(error.code, error.message);
    }
};

const update = async (prevHotel, currentHotel, manager, ownerId) => {
    try {
        await verifyManagerOwnership(manager, ownerId);

        const existingManager = await userRepo.findOne({ where: { id: manager, role: USER_ROLES[1] } });
        if (!existingManager) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Manager not found');
        }

        if (currentHotel) {
            const hotelManagerAssignments = await hotelUserRelationRepo.find({
                where: { hotelId: currentHotel },
                include: [
                    {
                        model: db.users,
                        where: {
                            role: USER_ROLES[1],
                            id: {
                                [Op.ne]: manager
                            }
                        }
                    }
                ]
            });

            if (hotelManagerAssignments.rows.length) {
                throw CustomError(STATUS_CODE.CONFLICT, 'Selected hotel already has a manager assigned');
            }
        }

        if (prevHotel) {
            const hotelOptions = {
                where: {
                    hotelId: prevHotel,
                    userId: manager
                }
            };
            await hotelUserRelationRepo.remove(hotelOptions);
            logger('debug', `${prevHotel} hotel manager unassigned`);
        }

        if (currentHotel) {
            const options = {
                id: uuidv4(),
                hotelId: currentHotel,
                userId: manager
            };

            logger('debug', `${currentHotel} hotel manager assigned`);
            const relation = await hotelUserRelationRepo.save([options]);
            return { data: relation[0] };
        }

        return { message: 'Manager updated successfully' };
    } catch (error) {
        logger('error', 'Error while updating manager', { error });
        throw CustomError(error.code, error.message);
    }
};

const remove = async (managerId, ownerId) => {
    try {
        await verifyManagerOwnership(managerId, ownerId);

        const options = {
            where: { userId: managerId }
        };
        await inviteRepo.remove(options);
        logger('debug', `Invite record removed for ${managerId}`);

        await hotelUserRelationRepo.remove(options);
        logger('debug', `Hotel and user relation removed for ${managerId}`);

        const userOptions = {
            where: { id: managerId }
        };
        await userRepo.remove(userOptions);
        logger('debug', `User removed for ${managerId}`);

        return { message: 'User removed successfully' };
    } catch (error) {
        logger('error', 'Error while removing manager', { error });
        throw CustomError(error.code, error.message);
    }
};

const getAssignable = async (ownerId, filter) => {
    try {
        const limit = 25;
        const options = {
            where: {
                ownerId,
                status: INVITE_STATUS[1]
            },
            include: [
                {
                    model: db.users,
                    where: {
                        id: {
                            [Op.notIn]: literal(
                                `(SELECT userId FROM ${TABLES.HOTEL_USER_RELATION} WHERE deletedAt IS NULL)`
                            )
                        }
                    }
                }
            ],
            limit
        };

        if (filter) {
            const condition = {
                [Op.or]: [{ firstName: { [Op.like]: `%${filter}%` } }, { lastName: { [Op.like]: `%${filter}%` } }]
            };
            options.include[0].where = {
                ...options.include[0].where,
                ...condition
            };
        }
        logger('debug', `Fetching assignable managers with options ${JSON.stringify(options)}`);

        const invites = await inviteRepo.find(options);
        logger('info', `Fetched assignable managers ${JSON.stringify(invites)}`);

        const rows = invites.rows.map((item) => ({
            id: item.user.id,
            name: `${item.user.firstName} ${item.user.lastName}`
        }));

        return { count: invites.count, rows };
    } catch (error) {
        logger('error', `Error while fetching assignable managers ${JSON.stringify(error)}`);
        throw CustomError(error.code, error.message);
    }
};

const updateCredentials = async (managerId, ownerId, payload) => {
    try {
        await verifyManagerOwnership(managerId, ownerId);

        const existingManager = await userRepo.findOne({ where: { id: managerId, role: USER_ROLES[1] } });
        if (!existingManager) {
            throw CustomError(STATUS_CODE.NOT_FOUND, 'Manager not found');
        }

        if (payload.email) {
            const existingEmailUser = await userRepo.findOne({ where: { email: payload.email } });
            if (existingEmailUser && existingEmailUser.id !== managerId) {
                throw CustomError(STATUS_CODE.CONFLICT, 'Email already registered');
            }
        }

        const updateData = {};
        if (payload.email) {
            updateData.email = payload.email;
        }
        if (payload.password) {
            updateData.password = payload.password;
        }

        if (Object.keys(updateData).length === 0) {
            return { message: 'Nothing to update' };
        }

        await userRepo.update({ where: { id: managerId } }, updateData);
        if (payload.email) {
            await inviteRepo.update({ userId: managerId }, { email: payload.email });
        }

        return { message: 'Manager credentials updated successfully' };
    } catch (error) {
        logger('error', 'Error while updating manager credentials', { error });
        throw CustomError(error.code, error.message);
    }
};

const create = async (payload) => {
    let transaction;

    try {
        const { firstName, lastName, phoneNumber, email, password, hotelId, ownerId } = payload;

        logger('debug', `Creating manager with email: ${email}, hotelId: ${hotelId}`);

        // Check if hotel already has a manager
        if (hotelId) {
            const existingManager = await hotelUserRelationRepo.find({
                where: { hotelId },
                include: [
                    {
                        model: db.users,
                        where: { role: USER_ROLES[1] }
                    }
                ]
            });

            if (existingManager.rows.length > 0) {
                throw CustomError(STATUS_CODE.CONFLICT, 'This cafe already has a manager assigned');
            }
        }

        // Check if email already exists
        const existingUser = await userRepo.findOne({ where: { email } });
        if (existingUser) {
            throw CustomError(STATUS_CODE.CONFLICT, 'Email already registered');
        }

        // Check if phone number already exists
        const existingPhone = await userRepo.findOne({ where: { phoneNumber } });
        if (existingPhone) {
            throw CustomError(STATUS_CODE.CONFLICT, 'Phone number already registered');
        }

        transaction = await db.users.sequelize.transaction();

        // Create manager user
        const managerId = uuidv4();
        const user = {
            id: managerId,
            firstName,
            lastName,
            phoneNumber,
            email,
            password,
            status: USER_STATUS[0], // ACTIVE
            role: USER_ROLES[1] // MANAGER
        };

        const createdUser = await userRepo.save(user, { transaction });
        logger('info', 'Manager user created successfully:', createdUser);

        // Create INVITE record to make manager discoverable in fetch
        const inviteId = uuidv4();
        const invite = {
            id: inviteId,
            email,
            ownerId,
            userId: managerId,
            status: INVITE_STATUS[1] // ACCEPTED - manager is already active
        };
        await inviteRepo.save(invite, { transaction });
        logger('debug', `Invite record created for manager ${managerId}`);

        // Assign hotel to manager if hotelId provided
        if (hotelId) {
            const relation = {
                id: uuidv4(),
                hotelId,
                userId: managerId
            };
            await hotelUserRelationRepo.save([relation], { transaction });
            logger('debug', `Manager ${managerId} assigned to hotel ${hotelId}`);
        }

        await transaction.commit();
        transaction = null;

        return { message: 'Manager created successfully', data: createdUser };
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }

        logger('error', `Error while creating manager: ${error}`);
        if (isCustomError(error)) {
            throw error;
        }
        throw CustomError(error.code || STATUS_CODE.INTERNAL_SERVER_ERROR, error.message);
    }
};

export default {
    fetch,
    update,
    remove,
    getAssignable,
    create
};
