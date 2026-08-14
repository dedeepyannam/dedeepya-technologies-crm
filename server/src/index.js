const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dealRoutes = require('./routes/dealRoutes');
const taskRoutes = require('./routes/taskRoutes');
const followupRoutes = require('./routes/followupRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Global Process Exception Handlers
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

const app = express();

const PORT = process.env.PORT || 5000;

// Security Headers
app.use(helmet());

// Configure CORS
// Configure CORS — allow localhost dev and Netlify production
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://splendorous-rolypoly-7562b4.netlify.app',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    },
    credentials: true
}));


// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health-Check API Endpoint
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        message: 'CRM System Backend API is online',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root API Endpoint
app.get('/', (req, res) => {
    res.json({
        message:
            'Welcome to CRM System REST API. Use /api/v1/health to check server status.'
    });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Route Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Centralized Error Handler
app.use(errorHandler);

const { startNotificationJobs } = require('./jobs/notificationJob');

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRM Backend Server running on port ${PORT}`);

    // Start Background Cron Jobs
    startNotificationJobs();
});