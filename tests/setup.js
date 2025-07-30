const dotenv = require('dotenv');

// Load environment variables for testing
dotenv.config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/whisper-api-test';

// Set longer timeout for database operations
jest.setTimeout(30000);
