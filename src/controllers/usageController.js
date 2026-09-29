const store = require('../store/usageStore');
const { validateUsagePayload } = require('../utils/validate');

// POST /api/usage
function createUsage(req, res) {
  const errors = validateUsagePayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const { subscriberId, callMinutes, smsCount, dataUsageMB } = req.body;
  const record = store.addRecord({ subscriberId, callMinutes, smsCount, dataUsageMB });

  return res.status(201).json(record);
}

// GET /api/usage  (optional ?subscriberId=SUB01 filter)
function listUsage(req, res) {
  const { subscriberId } = req.query;
  const records = subscriberId
    ? store.getRecordsBySubscriber(subscriberId)
    : store.getAllRecords();

  return res.status(200).json({ count: records.length, records });
}

// GET /api/usage/:subscriberId
function getUsageBySubscriber(req, res) {
  const { subscriberId } = req.params;
  const records = store.getRecordsBySubscriber(subscriberId);

  if (records.length === 0) {
    return res.status(404).json({ error: `No usage records found for subscriberId '${subscriberId}'` });
  }

  return res.status(200).json({ count: records.length, records });
}

module.exports = { createUsage, listUsage, getUsageBySubscriber };
