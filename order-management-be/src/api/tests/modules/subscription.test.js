import moment from 'moment';
import checkSubscriptionAccess from '../../middlewares/subscription.js';
import userRepo from '../../repositories/user.repository.js';
import hotelUserRelationRepo from '../../repositories/hotelUserRelation.repository.js';

jest.mock('../../repositories/user.repository.js', () => ({
    findOne: jest.fn(),
    update: jest.fn()
}));

jest.mock('../../repositories/hotelUserRelation.repository.js', () => ({
    find: jest.fn()
}));

describe('Subscription Middleware Tests', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: {
                id: 'owner-123',
                role: 'OWNER'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        next = jest.fn();
    });

    test('should return 403 if req.user is missing', async () => {
        req.user = null;
        await checkSubscriptionAccess(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: 'Subscription expired' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if owner user not found in database', async () => {
        userRepo.findOne.mockResolvedValue(null);
        await checkSubscriptionAccess(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: 'Subscription expired' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next if owner subscription status is ACTIVE and not expired', async () => {
        const ownerData = {
            id: 'owner-123',
            subscriptionStatus: 'ACTIVE',
            subscriptionEndAt: moment().add(1, 'day').toISOString()
        };
        userRepo.findOne.mockResolvedValue(ownerData);

        await checkSubscriptionAccess(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should call next if owner subscription status is ACTIVE and has no subscriptionEndAt (backward compatibility)', async () => {
        const ownerData = {
            id: 'owner-123',
            subscriptionStatus: 'ACTIVE',
            subscriptionEndAt: null
        };
        userRepo.findOne.mockResolvedValue(ownerData);

        await checkSubscriptionAccess(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should update to EXPIRED and return 403 if owner subscription status is ACTIVE but subscriptionEndAt is in the past', async () => {
        const ownerData = {
            id: 'owner-123',
            subscriptionStatus: 'ACTIVE',
            subscriptionEndAt: moment().subtract(1, 'day').toISOString(),
            trialEndAt: moment().subtract(5, 'days').toISOString()
        };
        userRepo.findOne.mockResolvedValue(ownerData);
        userRepo.update.mockResolvedValue([1]);

        await checkSubscriptionAccess(req, res, next);

        expect(userRepo.update).toHaveBeenCalledWith(
            { where: { id: 'owner-123' } },
            { subscriptionStatus: 'EXPIRED' }
        );
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: 'Subscription expired' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next if owner has active trial (trialEndAt in the future)', async () => {
        const ownerData = {
            id: 'owner-123',
            subscriptionStatus: 'TRIAL',
            trialEndAt: moment().add(5, 'minutes').toISOString()
        };
        userRepo.findOne.mockResolvedValue(ownerData);

        await checkSubscriptionAccess(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should initialize trial fields and call next if owner has TRIAL status but trialEndAt is null', async () => {
        const ownerData = {
            id: 'owner-123',
            subscriptionStatus: 'TRIAL',
            trialEndAt: null,
            email: 'owner@example.com'
        };
        userRepo.findOne.mockResolvedValue(ownerData);
        userRepo.update.mockResolvedValue([1]);

        await checkSubscriptionAccess(req, res, next);

        expect(userRepo.update).toHaveBeenCalledWith(
            { where: { id: 'owner-123' } },
            expect.objectContaining({
                trialStartAt: expect.any(String),
                trialEndAt: expect.any(String)
            })
        );
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should update status to EXPIRED and return 403 if trialEndAt is in the past', async () => {
        const ownerData = {
            id: 'owner-123',
            subscriptionStatus: 'TRIAL',
            trialEndAt: moment().subtract(1, 'second').toISOString()
        };
        userRepo.findOne.mockResolvedValue(ownerData);
        userRepo.update.mockResolvedValue([1]);

        await checkSubscriptionAccess(req, res, next);

        expect(userRepo.update).toHaveBeenCalledWith(
            { where: { id: 'owner-123' } },
            { subscriptionStatus: 'EXPIRED' }
        );
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: 'Subscription expired' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should identify owner and call next for MANAGER role if associated owner subscription is active', async () => {
        req.user = {
            id: 'manager-123',
            role: 'MANAGER',
            hotelId: 'hotel-123'
        };

        hotelUserRelationRepo.find.mockResolvedValue({
            rows: [{ userId: 'owner-123' }]
        });

        const ownerData = {
            id: 'owner-123',
            subscriptionStatus: 'ACTIVE',
            subscriptionEndAt: moment().add(1, 'day').toISOString()
        };
        userRepo.findOne.mockResolvedValue(ownerData);

        await checkSubscriptionAccess(req, res, next);

        expect(hotelUserRelationRepo.find).toHaveBeenCalledWith({
            where: { hotelId: 'hotel-123' },
            include: expect.any(Array),
            limit: 1
        });
        expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'owner-123' } });
        expect(next).toHaveBeenCalled();
    });
});
