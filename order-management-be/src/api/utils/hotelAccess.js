import { Op } from 'sequelize';
import { USER_ROLES } from '../models/user.model.js';
import categoryRepo from '../repositories/category.repository.js';
import hotelUserRelationRepo from '../repositories/hotelUserRelation.repository.js';
import tableRepo from '../repositories/table.repository.js';
import { CustomError, STATUS_CODE } from './common.js';

export const getAssignedHotelId = async (userId) => {
    const { rows } = await hotelUserRelationRepo.find({
        where: { userId },
        attributes: ['hotelId'],
        order: [['updatedAt', 'DESC']],
        limit: 1
    });
    return rows[0]?.hotelId || null;
};

/**
 * Ensures the user may access the requested hotel.
 * Managers are always scoped to their assigned hotel (client hotelId is ignored).
 */
export const resolveHotelAccess = async (user, requestedHotelId) => {
    if (user.role === USER_ROLES[1]) {
        const assignedHotelId = user.hotelId || (await getAssignedHotelId(user.id));
        if (!assignedHotelId) {
            throw CustomError(STATUS_CODE.FORBIDDEN, 'Manager is not assigned to any cafe');
        }
        if (requestedHotelId && requestedHotelId !== 'undefined' && requestedHotelId !== 'null' && requestedHotelId !== assignedHotelId) {
            throw CustomError(STATUS_CODE.FORBIDDEN, 'Access denied to this cafe');
        }
        return assignedHotelId;
    }

    if (!requestedHotelId) {
        throw CustomError(STATUS_CODE.BAD_REQUEST, 'Hotel id is required');
    }

    const { count } = await hotelUserRelationRepo.find({
        where: { userId: user.id, hotelId: requestedHotelId },
        limit: 1
    });

    if (!count) {
        throw CustomError(STATUS_CODE.FORBIDDEN, 'Access denied to this cafe');
    }

    return requestedHotelId;
};

export const resolveHotelAccessByCategoryIds = async (user, categoryIds) => {
    if (!categoryIds?.length) {
        throw CustomError(STATUS_CODE.BAD_REQUEST, 'Category id is required');
    }

    const { rows } = await categoryRepo.find({
        where: { id: { [Op.in]: categoryIds } },
        attributes: ['hotelId']
    });

    const hotelIds = [...new Set(rows.map((row) => row.hotelId))];
    if (!hotelIds.length) {
        throw CustomError(STATUS_CODE.NOT_FOUND, 'Category not found');
    }

    for (const hotelId of hotelIds) {
        await resolveHotelAccess(user, hotelId);
    }
};

export const resolveHotelAccessByCategoryId = async (user, categoryId) => {
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null') {
        throw CustomError(STATUS_CODE.NOT_FOUND, 'Category not found');
    }

    let rows;
    try {
        const result = await categoryRepo.find({
            where: { id: categoryId },
            attributes: ['hotelId'],
            limit: 1
        });
        rows = result.rows;
    } catch (error) {
        throw CustomError(STATUS_CODE.NOT_FOUND, 'Category not found');
    }

    const category = rows?.[0];

    if (!category?.hotelId) {
        throw CustomError(STATUS_CODE.NOT_FOUND, 'Category not found');
    }

    return resolveHotelAccess(user, category.hotelId);
};

export const resolveHotelAccessByTableId = async (user, tableId) => {
    const table = await tableRepo.findOne({
        where: { id: tableId },
        attributes: ['hotelId']
    });

    if (!table?.hotelId) {
        throw CustomError(STATUS_CODE.NOT_FOUND, 'Table not found');
    }

    return resolveHotelAccess(user, table.hotelId);
};
