import mysql2 from 'mysql2';
import { Sequelize } from 'sequelize';
import defineAssociations from '../api/models/associations.js';
import categoryModel from '../api/models/category.model.js';
import customerModel from '../api/models/customer.modal.js';
import hotelModel from '../api/models/hotel.model.js';
import hotelUserRelationModel from '../api/models/hotelUserRelation.model.js';
import inviteModel from '../api/models/invite.model.js';
import menuModel from '../api/models/menu.model.js';
import notificationModel from '../api/models/notification.model.js';
import orderModel from '../api/models/order.model.js';
import paymentGatewayEntitiesModel from '../api/models/paymentGatewayEntities.js';
import preferencesModel from '../api/models/preferences.model.js';
import pushSubscriptionsModel from '../api/models/pushSubscriptions.model.js';
import subscriptionModel from '../api/models/subscriptions.js';
import tableModel from '../api/models/table.model.js';
import userModel from '../api/models/user.model.js';
import { CustomError } from '../api/utils/common.js';
import env from './env.js';
import logger from './logger.js';

const config = {
    host: env.db.host,
    dialect: env.db.dialect,
    dialectModule: mysql2,
    port: env.db.port,
    username: env.db.user,
    password: env.db.password,
    pool: {
        max: 3,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

let sequelizeInstance = null;
export const db = {};

const createDatabase = async () => {
    try {
        logger('info', '🚀 Connecting to the database...');
        const creatDbInstance = new Sequelize({ ...config });

        await creatDbInstance.authenticate();
        logger('info', '✅ Database connection authenticated successfully.');

        logger('info', '🏗️ Creating database if not exists...');
        await creatDbInstance.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.name}\`;`);
        logger('info', '🏢 Database created successfully.');

        await creatDbInstance.close();

        sequelizeInstance = new Sequelize({ ...config, database: env.db.name, logging: false });
        return sequelizeInstance;
    } catch (error) {
        logger('error', `❌ Error creating database: ${error}`);
        throw CustomError(error.code, error.message);
    }
};

const getSequelizeInstance = async () => {
    if (!sequelizeInstance) {
        sequelizeInstance = await createDatabase();
    }
    return sequelizeInstance;
};

const defineModels = (sequelize) => {
    db.Sequelize = Sequelize;
    db.users = userModel(sequelize);
    db.invites = inviteModel(sequelize);
    db.hotel = hotelModel(sequelize);
    db.hotelUserRelation = hotelUserRelationModel(sequelize);
    db.tables = tableModel(sequelize);
    db.categories = categoryModel(sequelize);
    db.menu = menuModel(sequelize);
    db.preferences = preferencesModel(sequelize);
    db.customer = customerModel(sequelize);
    db.orders = orderModel(sequelize);
    db.pushSubscriptions = pushSubscriptionsModel(sequelize);
    db.notifications = notificationModel(sequelize);
    db.paymentGatewayEntities = paymentGatewayEntitiesModel(sequelize);
    db.subscriptions = subscriptionModel(sequelize);
};

const initDb = async () => {
    try {
        logger('info', '🚀 Initializing database...');
        const sequelize = await getSequelizeInstance();

        logger('info', '🛠️ Defining database models...');
        defineModels(sequelize);
        defineAssociations(db);

        logger('info', '🔄 Syncing models with database...');
        await sequelize.sync({ force: false });

        const alterColumns = [
            { name: 'trialStartAt', type: 'DATETIME NULL' },
            { name: 'trialEndAt', type: 'DATETIME NULL' },
            { name: 'subscriptionStartAt', type: 'DATETIME NULL' },
            { name: 'subscriptionEndAt', type: 'DATETIME NULL' },
            { name: 'subscriptionStatus', type: 'VARCHAR(20) DEFAULT \'TRIAL\' NOT NULL' },
            { name: 'subscriptionPlan', type: 'VARCHAR(50) NULL' },
            { name: 'razorpayOrderId', type: 'VARCHAR(255) NULL' },
            { name: 'razorpayPaymentId', type: 'VARCHAR(255) NULL' }
        ];

        for (const col of alterColumns) {
            try {
                await sequelize.query(`ALTER TABLE \`users\` ADD COLUMN \`${col.name}\` ${col.type};`);
                logger('info', `✅ Column ${col.name} added to users table`);
            } catch (e) {
                try {
                    await sequelize.query(`ALTER TABLE \`users\` MODIFY COLUMN \`${col.name}\` ${col.type};`);
                    logger('info', `✅ Column ${col.name} modified/exists in users table`);
                } catch (modifyError) {
                    logger('error', `❌ Error modifying column ${col.name}: ${modifyError.message}`);
                }
            }
        }

        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`hotelId\` VARCHAR(255) NULL;`);
            logger('info', '✅ Column hotelId added/exists in orders table');
        } catch (e) {
            // Ignore error if column already exists
        }
        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`tableId\` VARCHAR(255) NULL;`);
            logger('info', '✅ Column tableId added/exists in orders table');
        } catch (e) {
            // Ignore error if column already exists
        }

        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`subtotalAmount\` INT NULL;`);
            logger('info', '✅ Column subtotalAmount added/exists in orders table');
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`cgstAmount\` INT NULL;`);
            logger('info', '✅ Column cgstAmount added/exists in orders table');
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`sgstAmount\` INT NULL;`);
            logger('info', '✅ Column sgstAmount added/exists in orders table');
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`tipAmount\` INT NULL DEFAULT 0;`);
            logger('info', '✅ Column tipAmount added/exists in orders table');
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`finalAmount\` INT NULL;`);
            logger('info', '✅ Column finalAmount added/exists in orders table');
        } catch (e) {}

        try {
            await sequelize.query(`ALTER TABLE \`orders\` ADD COLUMN \`orderNumber\` VARCHAR(100) NULL;`);
            logger('info', '✅ Column orderNumber added/exists in orders table');
        } catch (e) {}

        try {
            await sequelize.query(`ALTER TABLE \`orders\` DROP INDEX \`orderNumber\`;`);
            logger('info', '✅ Removed unique index from orders.orderNumber');
        } catch (e) {}

        try {
            await sequelize.query(`UPDATE \`orders\` SET \`subtotalAmount\` = \`price\`, \`cgstAmount\` = ROUND(\`price\` * 0.025), \`sgstAmount\` = ROUND(\`price\` * 0.025), \`finalAmount\` = \`price\` + ROUND(\`price\` * 0.025) * 2 WHERE \`finalAmount\` IS NULL;`);
            logger('info', '✅ Existing orders populated with subtotal and GST amounts');
        } catch (e) {
            logger('error', '❌ Error populating existing orders with GST:', e);
        }

        logger('info', '🎉 Database initialization completed successfully.');
    } catch (error) {
        logger('error', `❌ Error initializing database: ${error}`);
        throw CustomError(error.code, error.message);
    }
};

export default initDb;
