const app = require('./app');
const config = require('./config');
const { initializeFirebase } = require('./config/firebase');

const startServer = () => {
  // Initialize Firebase
  try {
    initializeFirebase();
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    console.warn('Server will start but Firebase operations may fail');
  }

  const server = app.listen(config.port, () => {
    console.log(`backend running on port ${config.port}`);
  });

  const shutdown = () => {
    console.log('Gracefully shutting down...');
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();

