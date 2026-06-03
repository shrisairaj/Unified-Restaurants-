/* eslint-disable no-console */
import orderService from './api/services/order.service.js';
import initDb, { db } from './config/database.js';

const test = async () => {
    try {
        await initDb();
        console.log('DB Initialized successfully');

        const hotel = await db.hotel.findOne();
        if (!hotel) {
            console.log('No hotel found');
            process.exit(0);
        }

        console.log('Calling getMenuDetails for hotel:', hotel.id, hotel.name);
        const result = await orderService.getMenuDetails(hotel.id, 'some-customer-id');
        console.log('Result:', JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

test();
