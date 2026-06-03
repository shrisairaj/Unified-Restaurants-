import { DataTypes } from 'sequelize';
import { TABLES } from '../utils/common.js';

export const ORDER_STATUS = ['PENDING', 'SERVED', 'CANCELLED', 'COMPLETED'];
const orderModel = (sequelize) =>
    sequelize.define(
        TABLES.ORDER,
        {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            menuId: {
                type: DataTypes.STRING,
                allowNull: false,
                references: {
                    model: TABLES.MENU,
                    key: 'id'
                }
            },
            customerId: {
                type: DataTypes.STRING,
                allowNull: false,
                references: {
                    model: TABLES.CUSTOMER,
                    key: 'id'
                }
            },
            hotelId: {
                type: DataTypes.STRING,
                allowNull: true,
                references: {
                    model: TABLES.HOTEL,
                    key: 'id'
                }
            },
            tableId: {
                type: DataTypes.STRING,
                allowNull: true,
                references: {
                    model: TABLES.TABLE,
                    key: 'id'
                }
            },
            price: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            quantity: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM,
                allowNull: false,
                values: ORDER_STATUS,
                defaultValue: ORDER_STATUS[0]
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true
            },
            edited: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            orderNumber: {
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
            subtotalAmount: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            cgstAmount: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            sgstAmount: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            tipAmount: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0
            },
            finalAmount: {
                type: DataTypes.INTEGER,
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

export default orderModel;
