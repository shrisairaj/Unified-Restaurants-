export async function up(queryInterface, Sequelize) {
    // add columns to users table
    await queryInterface.addColumn('users', 'trialStartAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('users', 'trialEndAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('users', 'subscriptionStartAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('users', 'subscriptionEndAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('users', 'subscriptionStatus', {
        type: Sequelize.ENUM('TRIAL', 'ACTIVE', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'TRIAL'
    });
    await queryInterface.addColumn('users', 'subscriptionPlan', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('users', 'razorpayOrderId', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('users', 'razorpayPaymentId', { type: Sequelize.STRING, allowNull: true });
}

export async function down(queryInterface) {
    await queryInterface.removeColumn('users', 'trialStartAt');
    await queryInterface.removeColumn('users', 'trialEndAt');
    await queryInterface.removeColumn('users', 'subscriptionStartAt');
    await queryInterface.removeColumn('users', 'subscriptionEndAt');
    await queryInterface.removeColumn('users', 'subscriptionPlan');
    await queryInterface.removeColumn('users', 'razorpayOrderId');
    await queryInterface.removeColumn('users', 'razorpayPaymentId');
    await queryInterface.removeColumn('users', 'subscriptionStatus');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_subscriptionStatus"');
}
