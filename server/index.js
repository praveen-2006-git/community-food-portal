if (require.main && require.main.filename && require.main.filename.includes('verify') && process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'test';
}
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const ingredientRoutes = require('./routes/ingredients');
const adminRoutes = require('./routes/admin');
const kitchenRoutes = require('./routes/kitchen');
const statsRoutes = require('./routes/stats');
const reservationRoutes = require('./routes/reservations');
const issueReportRoutes = require('./routes/issueReports');
const { authenticateJWT, authorizeRoles } = require('./middleware/auth');
const { startAutoExpireJob } = require('./utils/cron');

// Fail-fast environment validations BEFORE DB connection
const isTest = process.env.NODE_ENV === 'test';
if (!isTest) {
  if (!process.env.MONGODB_URI) {
    console.error('\nCRITICAL ERROR: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('\nCRITICAL ERROR: JWT_SECRET environment variable is missing.');
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'super_secret_key_12345') {
    console.error('\nCRITICAL ERROR: JWT_SECRET is set to the default insecure value.');
    process.exit(1);
  }
  if (!process.env.PICKUP_CODE_SECRET) {
    console.error('\nCRITICAL ERROR: PICKUP_CODE_SECRET environment variable is missing.');
    process.exit(1);
  }
  if (process.env.PICKUP_CODE_SECRET.length < 32) {
    console.error('\nCRITICAL ERROR: PICKUP_CODE_SECRET must be at least 32 characters long.');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware Stack
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('\n================================================================');
  console.error('CRITICAL ERROR: FRONTEND_URL environment variable is missing.');
  console.error('This is required in production to restrict CORS strictly.');
  console.error('================================================================\n');
  throw new Error('FRONTEND_URL environment variable is missing in production');
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy block'), false);
  }
};

app.use(cors(corsOptions));

app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'"]
    }
  } : false,
  crossOriginEmbedderPolicy: NODE_ENV === 'production',
}));

// Custom MongoDB Sanitizer middleware (Express 5 compatible)
const sanitizeObject = (obj) => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
};

const customMongoSanitize = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) {
    for (const key in req.query) {
      if (key.startsWith('$')) {
        delete req.query[key];
      } else if (req.query[key] instanceof Object) {
        sanitizeObject(req.query[key]);
      }
    }
  }
  if (req.params) sanitizeObject(req.params);
  next();
};

app.use(customMongoSanitize);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (req) => process.env.NODE_ENV === 'test',
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  skip: (req) => process.env.NODE_ENV === 'test',
  message: { message: 'Too many accounts created from this IP, please try again after 15 minutes.' }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/issue-reports', issueReportRoutes);

// Protected Test Routes to verify Middleware
app.get('/api/test/any', authenticateJWT, (req, res) => {
  res.json({ message: 'Success! Access granted to authenticated user.', user: req.user });
});

app.get('/api/test/donor', authenticateJWT, authorizeRoles('donor'), (req, res) => {
  res.json({ message: 'Success! Access granted to Donor route.', user: req.user });
});

app.get('/api/test/soup_kitchen', authenticateJWT, authorizeRoles('soup_kitchen'), (req, res) => {
  res.json({ message: 'Success! Access granted to Soup Kitchen route.', user: req.user });
});

app.get('/api/test/admin', authenticateJWT, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Success! Access granted to Admin route.', user: req.user });
});

// Global error handling middleware (stack trace suppression in production)
app.use((err, req, res, next) => {
  console.error(err.stack);
  const response = { message: err.message || 'Internal server error occurred.' };
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  res.status(err.status || 500).json(response);
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start the background sweeper job (checking every 30 seconds)
  startAutoExpireJob(30000);
  
  // Run status normalization migration
  const { runMigration } = require('./utils/migration');
  runMigration();
});

module.exports = { app, server };
