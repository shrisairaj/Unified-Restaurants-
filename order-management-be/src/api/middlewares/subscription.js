import moment from 'moment';
import { db } from '../../config/database.js';
import logger from '../../config/logger.js';
import hotelUserRelationRepo from '../repositories/hotelUserRelation.repository.js';
import userRepo from '../repositories/user.repository.js';

const checkSubscriptionAccess = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.status(403).send({ message: 'Subscription expired' });

        // If owner, check own subscription
        let ownerId = user.id;
        if (user.role === 'MANAGER') {
            let managerHotelId = user.hotelId;
            if (!managerHotelId) {
                const assigned = await hotelUserRelationRepo.find({ where: { userId: user.id }, limit: 1 });
                if (assigned?.rows?.[0]) {
                    managerHotelId = assigned.rows[0].hotelId;
                }
            }
            if (managerHotelId) {
                const relation = await hotelUserRelationRepo.find({
                    where: { hotelId: managerHotelId },
                    include: [{
                        model: db.users,
                        where: { role: 'OWNER' },
                        attributes: ['id']
                    }],
                    limit: 1
                });
                if (relation?.rows?.[0]) {
                    ownerId = relation.rows[0].userId;
                }
            }
        }

        const owner = await userRepo.findOne({ where: { id: ownerId } });
        if (!owner) return res.status(403).send({ message: 'Subscription expired' });

        const now = moment();
        let ownerStatus = owner.subscriptionStatus;
        if (!ownerStatus) {
            ownerStatus = 'TRIAL';
            try {
                await userRepo.update({ where: { id: owner.id } }, { subscriptionStatus: 'TRIAL' });
                owner.subscriptionStatus = 'TRIAL';
            } catch (e) {
                logger('error', 'Error initializing subscriptionStatus in middleware', { e });
            }
        }

        // if active subscription
        if (ownerStatus === 'ACTIVE') {
            if (owner.subscriptionEndAt && moment(owner.subscriptionEndAt).isAfter(now)) {
                return next();
            }
            if (owner.subscriptionEndAt && moment(owner.subscriptionEndAt).isBefore(now)) {
                try {
                    await userRepo.update({ where: { id: owner.id } }, { subscriptionStatus: 'EXPIRED' });
                    ownerStatus = 'EXPIRED';
                } catch (e) {
                    logger('error', 'Error updating subscriptionStatus to EXPIRED in middleware', { e });
                }
            } else if (!owner.subscriptionEndAt) {
                return next();
            }
        }

        if (!owner.trialEndAt && ownerStatus === 'TRIAL') {
            // Auto initialize trial fields for existing user (backward compatibility)
            const trialStart = now.toISOString();
            const trialEnd = moment(now).add(2, 'minutes').toISOString();
            try {
                await userRepo.update({ where: { id: owner.id } }, {
                    trialStartAt: trialStart,
                    trialEndAt: trialEnd
                });
                owner.trialStartAt = trialStart;
                owner.trialEndAt = trialEnd;
                logger('info', `Initialized 2-minute trial for existing user ${owner.email}`);
            } catch (e) {
                logger('error', 'Error initializing trial fields for existing user', { e });
            }
        }

        // if trial is present and not expired
        if (owner.trialEndAt && moment(owner.trialEndAt).isAfter(now)) return next();

        // if trial expired but status not updated, update it
        if (owner.trialEndAt && moment(owner.trialEndAt).isBefore(now)) {
            try {
                await userRepo.update({ where: { id: owner.id } }, { subscriptionStatus: 'EXPIRED' });
            } catch (e) {
                logger('error', 'Error updating subscriptionStatus to EXPIRED', { e });
            }
        }

        return res.status(403).send({ message: 'Subscription expired' });
    } catch (error) {
        logger('error', 'Error while checking subscription access', { error });
        return res.status(500).send({ message: 'Internal Server Error' });
    }
};

export default checkSubscriptionAccess;
