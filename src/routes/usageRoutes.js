const express = require('express');
const {
  createUsage,
  listUsage,
  getUsageBySubscriber,
} = require('../controllers/usageController');

const router = express.Router();

router.post('/usage', createUsage);
router.get('/usage', listUsage);
router.get('/usage/:subscriberId', getUsageBySubscriber);

module.exports = router;
