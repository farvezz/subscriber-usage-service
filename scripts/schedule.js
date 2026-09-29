/**
 * Optional in-process scheduler (alternative to system cron).
 *
 * Runs the snapshot job at 08:00, 12:00, and 15:00 WIB every day, and the
 * cleanup job once daily at 00:30 WIB. Keep this process running (e.g.
 * under pm2/systemd) if you don't have access to the OS crontab.
 *
 * For a typical Linux server, prefer real crontab entries instead
 * (see README.md) — one less long-running Node process to babysit.
 */

const cron = require('node-cron');
const { takeSnapshot } = require('./snapshot');
const { cleanupOldSnapshots } = require('./cleanup');

const TIMEZONE = 'Asia/Jakarta';

cron.schedule('0 8,12,15 * * *', () => {
  takeSnapshot().catch((err) => console.error('Scheduled snapshot failed:', err.message));
}, { timezone: TIMEZONE });

cron.schedule('30 0 * * *', () => {
  cleanupOldSnapshots();
}, { timezone: TIMEZONE });

console.log(`Scheduler started (timezone: ${TIMEZONE}). Snapshots at 08:00/12:00/15:00, cleanup at 00:30.`);
