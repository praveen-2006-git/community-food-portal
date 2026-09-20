const { Inquiry, memoryInquiries } = require('../models/Inquiry');
const { getDBStatus } = require('../config/db');

const getAnalytics = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_API_KEY || 'admin_demo_secret_token_123';

    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing administrator credentials.',
      });
    }

    let inquiryCount = 0;
    let unreadCount = 0;

    if (getDBStatus()) {
      try {
        inquiryCount = await Inquiry.countDocuments();
        unreadCount = await Inquiry.countDocuments({ status: 'unread' });
      } catch {
        inquiryCount = memoryInquiries.length;
        unreadCount = memoryInquiries.filter((i) => i.status === 'unread').length;
      }
    } else {
      inquiryCount = memoryInquiries.length;
      unreadCount = memoryInquiries.filter((i) => i.status === 'unread').length;
    }

    return res.json({
      success: true,
      data: {
        totalInquiries: inquiryCount,
        unreadInquiries: unreadCount,
        databaseConnected: getDBStatus(),
        serverUptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
};
