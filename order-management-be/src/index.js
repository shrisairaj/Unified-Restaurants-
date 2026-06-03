import initDb from './config/database.js';
import env from './config/env.js';
import app from './config/express.js';
import logger from './config/logger.js';

const startServer = async () => {
    try {
        logger('info', '🚀 Starting server...');

        logger('info', '🔗 Establishing database connection...');
        await initDb();

        logger('info', '🔗 Establishing Notification connection...');
        // await initNotifications();

        const port = process.env.PORT || env.app.port;
        logger('info', `🌐 Server running on port ${port}...`);
        app.listen(port, () => {
            logger('info', `✅ Server started successfully on port ${port}.`);
        });

        app.on('error', (error) => {
            logger('error', `❌ Error starting server: ${error}`);
        });

        return app;
    } catch (error) {
        logger('error', `❌ Error starting server: ${error}`);
    }
};

startServer();
