/**
 * In-memory storage for usage records.
 * NOTE: Data is lost on process restart. Swap this module for a real
 * database (Postgres/Mongo/etc.) without touching controllers or routes,
 * since they only depend on the functions exported here.
 */

let records = [];
let nextId = 1;

function addRecord({ subscriberId, callMinutes, smsCount, dataUsageMB, timestamp }) {
  const record = {
    id: nextId++,
    subscriberId,
    callMinutes,
    smsCount,
    dataUsageMB,
    timestamp: timestamp || new Date().toISOString(),
  };
  records.push(record);
  return record;
}

function getAllRecords() {
  return records;
}

function getRecordsBySubscriber(subscriberId) {
  return records.filter((r) => r.subscriberId === subscriberId);
}

// Exposed mainly for tests / resets between test runs.
function _reset() {
  records = [];
  nextId = 1;
}

module.exports = {
  addRecord,
  getAllRecords,
  getRecordsBySubscriber,
  _reset,
};
