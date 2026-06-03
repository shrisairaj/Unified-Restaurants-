import { db } from '../../../config/database.js';
import hotelController from '../../controllers/hotel.controller.js';
import hotelRepo from '../../repositories/hotel.repository.js';
import hotelUserRelationRepo from '../../repositories/hotelUserRelation.repository.js';
import orderRepo from '../../repositories/order.repository.js';
import { create, list, remove, update } from '../utils/dummy.hotel.js';

jest.mock('../../../config/database.js', () => ({
    db: {
        tables: {
            destroy: jest.fn().mockResolvedValue(1)
        },
        customer: {
            findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
            destroy: jest.fn().mockResolvedValue(1)
        },
        orders: {
            destroy: jest.fn().mockResolvedValue(1)
        },
        categories: {
            destroy: jest.fn().mockResolvedValue(1)
        },
        menu: {
            name: 'menu',
            destroy: jest.fn().mockResolvedValue(1)
        },
        hotelUserRelation: {
            name: 'hotelUserRelation',
            destroy: jest.fn().mockResolvedValue(1)
        },
        subscriptions: {
            name: 'subscriptions',
            destroy: jest.fn().mockResolvedValue(1)
        },
        hotel: {
            name: 'hotel',
            destroy: jest.fn().mockResolvedValue(1)
        },
        users: { name: 'users' }
    }
}));

// Initializing an empty response object
let res = {};

// Creating spies to track function calls
const hotelRepoSaveSpy = jest.spyOn(hotelRepo, 'save');
const hotelRepoUpdateSpy = jest.spyOn(hotelRepo, 'update');
const hotelRepoRemoveSpy = jest.spyOn(hotelRepo, 'remove');
const hotelUserRelationRepoSaveSpy = jest.spyOn(hotelUserRelationRepo, 'save');
const hotelUserRelationRepoFindSpy = jest.spyOn(hotelUserRelationRepo, 'find');
const hotelUserRelationRepoRemoveSpy = jest.spyOn(hotelUserRelationRepo, 'remove');
const orderRepoFindSalesByHotelIdsSpy = jest.spyOn(orderRepo, 'findSalesByHotelIds');

// Describing the test suite for hotel registration functionality
describe('testing hotel cases', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        db.customer.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
        db.customer.destroy.mockResolvedValue(1);
        db.tables.destroy.mockResolvedValue(1);
        db.orders.destroy.mockResolvedValue(1);
        db.categories.destroy.mockResolvedValue(1);
        db.menu.destroy.mockResolvedValue(1);
        db.hotelUserRelation.destroy.mockResolvedValue(1);
        db.subscriptions.destroy.mockResolvedValue(1);
        db.hotel.destroy.mockResolvedValue(1);
        // Resetting response object
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    // create hotel
    test('test payload validation', async () => {
        const { validationTest } = create;
        await hotelController.register(validationTest.req, res);

        // Expectations for response status and data
        expect(res.status).toHaveBeenCalledWith(validationTest.res.status);
        expect(res.send).toHaveBeenCalledWith(validationTest.res.data);
    });

    test('test too many request error', async () => {
        const { tooManyRequest } = create;

        // Mocking resolved values for repository functions
        hotelUserRelationRepoFindSpy.mockResolvedValue(tooManyRequest.db.data);

        // Calling the hotel registration controller function
        await hotelController.register(tooManyRequest.req, res);

        // Expectations for function calls and response data
        expect(hotelUserRelationRepoFindSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(tooManyRequest.response.status);
        expect(res.send).toHaveBeenCalledWith(tooManyRequest.response.data);
    });

    test('test create hotel without manager', async () => {
        const { ownerTest } = create;

        // Mocking resolved values for repository functions
        hotelRepoSaveSpy.mockResolvedValue(ownerTest.db.hotel);
        hotelUserRelationRepoSaveSpy.mockResolvedValue({});
        hotelUserRelationRepoFindSpy.mockResolvedValue({ count: 5 });

        // Calling the hotel registration controller function
        await hotelController.register(ownerTest.req, res);

        // Expectations for function calls and response data
        expect(hotelRepoSaveSpy).toHaveBeenCalled();
        expect(hotelUserRelationRepoSaveSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(ownerTest.res.status);
        expect(res.send).toHaveBeenCalledWith(ownerTest.db.hotel);
    });

    test('test create hotel with manager', async () => {
        const { managerTest } = create;

        // Mocking resolved values for repository functions
        hotelRepoSaveSpy.mockResolvedValue(managerTest.db.hotel);
        hotelUserRelationRepoSaveSpy.mockResolvedValue();
        hotelUserRelationRepoFindSpy.mockResolvedValue({ count: 5 });

        // Calling the hotel registration controller function
        await hotelController.register(managerTest.req, res);

        // Expectations for function calls and response data
        expect(res.status).toHaveBeenCalledWith(managerTest.res.status);
        expect(hotelUserRelationRepoSaveSpy).toHaveBeenCalledTimes(2);
        expect(res.send).toHaveBeenCalledWith(managerTest.db.hotel);
    });

    test('test create hotel error', async () => {
        const { errorTest } = create;
        // Mocking rejected value for repository function
        hotelRepoSaveSpy.mockRejectedValue(errorTest.error);
        hotelUserRelationRepoFindSpy.mockResolvedValue({ count: 5 });

        // Calling the hotel registration controller function
        await hotelController.register(errorTest.req, res);

        // Expectations for error handling
        expect(res.status).toHaveBeenCalledWith(errorTest.res.status);
        expect(res.send).toHaveBeenCalledWith(errorTest.res.data);
    });

    // update hotel
    test('test update hotel successfully', async () => {
        const { success } = update;

        hotelRepoUpdateSpy.mockResolvedValue(1);

        await hotelController.update(success.req, res);

        expect(res.status).toHaveBeenCalledWith(success.res.status);
        expect(hotelRepoUpdateSpy).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith(success.res.data);
    });

    test('test update hotel throw error', async () => {
        const { error } = update;
        hotelRepoUpdateSpy.mockRejectedValue(new Error(error.error));
        await hotelController.update(error.req, res);

        expect(res.status).toHaveBeenCalledWith(error.res.status);
        expect(hotelRepoUpdateSpy).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith(error.res.data);
    });

    // list hotels
    test('test list hotel success', async () => {
        const { success } = list;
        hotelUserRelationRepoFindSpy.mockResolvedValue(success.db.data);
        orderRepoFindSalesByHotelIdsSpy.mockResolvedValue([]);

        await hotelController.list(success.req, res);

        expect(hotelUserRelationRepoFindSpy).toHaveBeenCalled();
        expect(orderRepoFindSalesByHotelIdsSpy).toHaveBeenCalledWith(['test-hotel-id-1', 'test-hotel-id-2']);
        expect(res.status).toHaveBeenCalledWith(success.res.status);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                count: success.res.data.count,
                rows: [
                    expect.objectContaining({ id: 'test-hotel-id-1', sales: 0 }),
                    expect.objectContaining({ id: 'test-hotel-id-2', sales: 0 })
                ]
            })
        );
    });

    test('test list hotel failed', async () => {
        const { error } = list;

        hotelUserRelationRepoFindSpy.mockRejectedValue(new Error(error.error));
        await hotelController.list(error.req, res);

        expect(hotelUserRelationRepoFindSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(error.res.status);
        expect(res.send).toHaveBeenCalledWith(error.res.data);
    });

    // remove hotel
    test('test remove hotel success', async () => {
        const { success } = remove;

        hotelRepoRemoveSpy.mockResolvedValue(success.db);
        hotelUserRelationRepoRemoveSpy.mockResolvedValue(success.db);

        await hotelController.remove(success.req, res);

        expect(hotelRepoRemoveSpy).toHaveBeenCalled();
        expect(hotelUserRelationRepoRemoveSpy).toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(success.response.status);
        expect(res.send).toHaveBeenCalledWith(success.response.data);
    });

    test('test remove hotel error', async () => {
        const { error } = remove;
        hotelRepoRemoveSpy.mockRejectedValue(new Error(error.error));

        await hotelController.remove(error.req, res);

        expect(hotelRepoRemoveSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(error.response.status);
        expect(res.send).toHaveBeenCalledWith(error.response.data);
    });
});
