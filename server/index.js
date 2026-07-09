const express = require('express');
const cors = require('cors');
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

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

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

// Basic Root
app.get('/', (req, res) => {
  res.send('Community Surplus Food Ingredient Inventory Routing Portal API is running.');
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start the background sweeper job (checking every 30 seconds)
  startAutoExpireJob(30000);
});

module.exports = { app, server };
