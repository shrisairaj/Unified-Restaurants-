import { DataTypes } from 'sequelize';
import { TABLES } from '../utils/common.js';

export const USER_STATUS = ['ACTIVE', 'INACTIVE'];
export const USER_ROLES = ['OWNER', 'MANAGER', 'ADMIN'];

const userModel = (sequelize) =>
    sequelize.define(
        TABLES.USERS,
        {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            firstName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            lastName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            phoneNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: DataTypes.STRING,
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM,
                values: USER_STATUS,
                allowNull: false
            },
            role: {
                type: DataTypes.ENUM,
                values: USER_ROLES,
                allowNull: false
            },
            trialStartAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            trialEndAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            subscriptionStartAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            subscriptionEndAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            subscriptionStatus: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'TRIAL'
            },
            subscriptionPlan: {
                type: DataTypes.STRING,
                allowNull: true
            },
            razorpayOrderId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            razorpayPaymentId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            deletedAt: {
                type: DataTypes.DATE,
                allowNull: true
            }
        },
        {
            paranoid: true
        }
    );

export default userModel;
