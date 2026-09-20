const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateJWT } = require('../middleware/auth');

// All notification endpoints require authenticated user
router.use(authenticateJWT);

// GET /api/notifications - Get current user's notifications (sorted by newest first)
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ userRef: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userRef: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Internal server error while fetching notifications.' });
  }
});

// PUT /api/notifications/:id/read - Mark a single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userRef: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }

    res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Internal server error while updating notification.' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read for current user
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { userRef: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Internal server error while updating notifications.' });
  }
});

module.exports = router;
