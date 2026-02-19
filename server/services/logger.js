const SystemLog = require('../models/SystemLog');

const logger = {
  async log(level, action, message, { user, req, metadata, duration, statusCode } = {}) {
    try {
      await SystemLog.create({
        level,
        action,
        message,
        user: user?._id || user,
        ip: req ? (req.headers['x-forwarded-for'] || req.ip) : undefined,
        userAgent: req?.headers['user-agent'],
        metadata,
        duration,
        statusCode
      });
    } catch (err) {
      console.error('[LOGGER] Failed to write log:', err.message);
    }
  },

  info(action, message, opts = {}) {
    console.log(`[INFO] ${action}: ${message}`);
    return this.log('info', action, message, opts);
  },

  warn(action, message, opts = {}) {
    console.warn(`[WARN] ${action}: ${message}`);
    return this.log('warn', action, message, opts);
  },

  error(action, message, opts = {}) {
    console.error(`[ERROR] ${action}: ${message}`);
    return this.log('error', action, message, opts);
  },

  security(action, message, opts = {}) {
    console.warn(`[SECURITY] ${action}: ${message}`);
    return this.log('security', action, message, opts);
  }
};

module.exports = logger;
