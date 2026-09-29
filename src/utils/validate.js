/**
 * Validates the body of a POST /api/usage request.
 * Returns an array of error strings; empty array means valid.
 */
function validateUsagePayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object.'];
  }

  const { subscriberId, callMinutes, smsCount, dataUsageMB } = body;

  if (typeof subscriberId !== 'string' || subscriberId.trim() === '') {
    errors.push('subscriberId is required and must be a non-empty string.');
  }

  for (const [field, value] of Object.entries({ callMinutes, smsCount, dataUsageMB })) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(`${field} is required and must be a number.`);
    } else if (value < 0) {
      errors.push(`${field} must not be negative.`);
    }
  }

  return errors;
}

module.exports = { validateUsagePayload };
