const prisma = require('../database/prisma');

class InstanceLogService {
  /**
   * Create a new instance log entry
   * @param {Object} data - Log data
   * @param {string} data.instanceId - Instance ID
   * @param {string} data.level - Log level (info, warn, error, debug)
   * @param {string} data.message - Log message
   */
  async create(data) {
    return await prisma.instanceLog.create({
      data: {
        instanceId: data.instanceId,
        level: data.level,
        message: data.message,
      },
    });
  }

  /**
   * Create log entry by instance phone number
   * @param {Object} data - Log data
   * @param {string} data.phone - Instance phone number
   * @param {string} data.level - Log level (info, warn, error, debug)
   * @param {string} data.message - Log message
   */
  async createByPhone(data) {
    // First find the instance by phone
    const instance = await prisma.instance.findUnique({
      where: { phone: data.phone },
      select: { id: true },
    });

    if (!instance) {
      throw new Error(`Instance with phone ${data.phone} not found`);
    }

    return await this.create({
      instanceId: instance.id,
      level: data.level,
      message: data.message,
    });
  }

  /**
   * Get logs for a specific instance
   * @param {string} instanceId - Instance ID
   * @param {Object} options - Query options
   * @param {number} [options.take] - Number of records to take (default: 100)
   * @param {number} [options.skip] - Number of records to skip (default: 0)
   * @param {string} [options.level] - Filter by log level
   * @param {Date} [options.startDate] - Filter logs from this date
   * @param {Date} [options.endDate] - Filter logs until this date
   */
  async findByInstanceId(instanceId, options = {}) {
    const where = {
      instanceId,
    };

    // Add level filter if provided
    if (options.level) {
      where.level = options.level;
    }

    // Add date range filter if provided
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    return await prisma.instanceLog.findMany({
      where,
      take: options.take || 100,
      skip: options.skip || 0,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        instance: {
          select: {
            phone: true,
            name: true,
            alias: true,
          },
        },
      },
    });
  }

  /**
   * Get logs for a specific instance by phone number
   * @param {string} phone - Instance phone number
   * @param {Object} options - Query options (same as findByInstanceId)
   */
  async findByInstancePhone(phone, options = {}) {
    // First find the instance by phone
    const instance = await prisma.instance.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!instance) {
      throw new Error(`Instance with phone ${phone} not found`);
    }

    return await this.findByInstanceId(instance.id, options);
  }

  /**
   * Get all logs across all instances
   * @param {Object} options - Query options
   * @param {number} [options.take] - Number of records to take (default: 100)
   * @param {number} [options.skip] - Number of records to skip (default: 0)
   * @param {string} [options.level] - Filter by log level
   * @param {Date} [options.startDate] - Filter logs from this date
   * @param {Date} [options.endDate] - Filter logs until this date
   */
  async findAll(options = {}) {
    const where = {};

    // Add level filter if provided
    if (options.level) {
      where.level = options.level;
    }

    // Add date range filter if provided
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    return await prisma.instanceLog.findMany({
      where,
      take: options.take || 100,
      skip: options.skip || 0,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        instance: {
          select: {
            phone: true,
            name: true,
            alias: true,
          },
        },
      },
    });
  }

  /**
   * Delete logs for a specific instance
   * @param {string} instanceId - Instance ID
   * @param {Object} options - Delete options
   * @param {Date} [options.olderThan] - Delete logs older than this date
   * @param {string} [options.level] - Delete logs of specific level
   */
  async deleteByInstanceId(instanceId, options = {}) {
    const where = {
      instanceId,
    };

    if (options.olderThan) {
      where.timestamp = {
        lt: options.olderThan,
      };
    }

    if (options.level) {
      where.level = options.level;
    }

    return await prisma.instanceLog.deleteMany({
      where,
    });
  }

  /**
   * Delete logs for a specific instance by phone number
   * @param {string} phone - Instance phone number
   * @param {Object} options - Delete options (same as deleteByInstanceId)
   */
  async deleteByInstancePhone(phone, options = {}) {
    // First find the instance by phone
    const instance = await prisma.instance.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!instance) {
      throw new Error(`Instance with phone ${phone} not found`);
    }

    return await this.deleteByInstanceId(instance.id, options);
  }

  /**
   * Get log statistics for an instance
   * @param {string} instanceId - Instance ID
   */
  async getStatsByInstanceId(instanceId) {
    const [total, info, warn, error, debug] = await Promise.all([
      prisma.instanceLog.count({ where: { instanceId } }),
      prisma.instanceLog.count({ where: { instanceId, level: 'info' } }),
      prisma.instanceLog.count({ where: { instanceId, level: 'warn' } }),
      prisma.instanceLog.count({ where: { instanceId, level: 'error' } }),
      prisma.instanceLog.count({ where: { instanceId, level: 'debug' } }),
    ]);

    return {
      total,
      info,
      warn,
      error,
      debug,
    };
  }

  /**
   * Get log statistics for an instance by phone number
   * @param {string} phone - Instance phone number
   */
  async getStatsByInstancePhone(phone) {
    // First find the instance by phone
    const instance = await prisma.instance.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!instance) {
      throw new Error(`Instance with phone ${phone} not found`);
    }

    return await this.getStatsByInstanceId(instance.id);
  }

  /**
   * Get recent logs for an instance (last 24 hours)
   * @param {string} instanceId - Instance ID
   * @param {number} [limit] - Number of logs to return (default: 50)
   */
  async getRecentByInstanceId(instanceId, limit = 50) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return await this.findByInstanceId(instanceId, {
      take: limit,
      startDate: yesterday,
    });
  }

  /**
   * Get recent logs for an instance by phone number (last 24 hours)
   * @param {string} phone - Instance phone number
   * @param {number} [limit] - Number of logs to return (default: 50)
   */
  async getRecentByInstancePhone(phone, limit = 50) {
    // First find the instance by phone
    const instance = await prisma.instance.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!instance) {
      throw new Error(`Instance with phone ${phone} not found`);
    }

    return await this.getRecentByInstanceId(instance.id, limit);
  }
}

module.exports = new InstanceLogService();
