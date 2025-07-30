const prisma = require('../database/prisma');

class WebhookHistoryService {
  /**
   * Create a new webhook history record
   * @param {Object} data - Webhook history data
   * @param {string} data.instanceId - Instance ID
   * @param {string} data.webhookId - Webhook ID
   * @param {string} data.event - Event type
   * @param {string} data.status - Trigger status
   * @param {number} [data.httpStatusCode] - HTTP response status code
   * @param {number} [data.responseTime] - Response time in milliseconds
   * @param {Object} data.payload - Payload sent to webhook
   * @param {Object} [data.response] - Response from webhook endpoint
   * @param {string} [data.errorMessage] - Error message if failed
   * @param {number} [data.retryCount] - Retry attempt count
   * @param {Date} [data.completedAt] - Completion timestamp
   */
  async create(data) {
    return await prisma.webhookHistory.create({
      data: {
        instanceId: data.instanceId,
        webhookId: data.webhookId,
        event: data.event,
        status: data.status,
        httpStatusCode: data.httpStatusCode,
        responseTime: data.responseTime,
        payload: data.payload,
        response: data.response,
        errorMessage: data.errorMessage,
        retryCount: data.retryCount || 0,
        completedAt: data.completedAt,
      },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Get webhook history for a specific instance
   * @param {string} instanceId - Instance ID
   * @param {Object} options - Query options
   */
  async findByInstance(instanceId, options = {}) {
    return await prisma.webhookHistory.findMany({
      where: { instanceId },
      take: options.take || 50,
      skip: options.skip || 0,
      orderBy: { triggeredAt: 'desc' },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Get webhook history for a specific webhook
   * @param {string} webhookId - Webhook ID
   * @param {Object} options - Query options
   */
  async findByWebhook(webhookId, options = {}) {
    return await prisma.webhookHistory.findMany({
      where: { webhookId },
      take: options.take || 50,
      skip: options.skip || 0,
      orderBy: { triggeredAt: 'desc' },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Get webhook history by status
   * @param {string} status - Status filter
   * @param {Object} options - Query options
   */
  async findByStatus(status, options = {}) {
    return await prisma.webhookHistory.findMany({
      where: { status },
      take: options.take || 50,
      skip: options.skip || 0,
      orderBy: { triggeredAt: 'desc' },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Get webhook history by event type
   * @param {string} event - Event type
   * @param {Object} options - Query options
   */
  async findByEvent(event, options = {}) {
    return await prisma.webhookHistory.findMany({
      where: { event },
      take: options.take || 50,
      skip: options.skip || 0,
      orderBy: { triggeredAt: 'desc' },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Get webhook history with date range filter
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   */
  async findByDateRange(startDate, endDate, options = {}) {
    return await prisma.webhookHistory.findMany({
      where: {
        triggeredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      take: options.take || 50,
      skip: options.skip || 0,
      orderBy: { triggeredAt: 'desc' },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Get webhook statistics
   * @param {string} [instanceId] - Optional instance ID filter
   * @param {string} [timeframe] - Time frame: 'hour', 'day', 'week', 'month'
   */
  async getStatistics(instanceId = null, timeframe = 'day') {
    const timeframes = {
      hour: new Date(Date.now() - 60 * 60 * 1000),
      day: new Date(Date.now() - 24 * 60 * 60 * 1000),
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const since = timeframes[timeframe] || timeframes.day;
    const whereClause = {
      triggeredAt: { gte: since },
      ...(instanceId && { instanceId }),
    };

    const [
      totalTriggers,
      successfulTriggers,
      failedTriggers,
      averageResponseTime,
      eventBreakdown,
      statusBreakdown,
    ] = await Promise.all([
      // Total triggers
      prisma.webhookHistory.count({ where: whereClause }),

      // Successful triggers
      prisma.webhookHistory.count({
        where: { ...whereClause, status: 'success' },
      }),

      // Failed triggers
      prisma.webhookHistory.count({
        where: { ...whereClause, status: { not: 'success' } },
      }),

      // Average response time
      prisma.webhookHistory.aggregate({
        where: { ...whereClause, responseTime: { not: null } },
        _avg: { responseTime: true },
      }),

      // Event breakdown
      prisma.webhookHistory.groupBy({
        by: ['event'],
        where: whereClause,
        _count: { _all: true },
      }),

      // Status breakdown
      prisma.webhookHistory.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { _all: true },
      }),
    ]);

    return {
      timeframe,
      period: {
        since: since.toISOString(),
        until: new Date().toISOString(),
      },
      totals: {
        triggers: totalTriggers,
        successful: successfulTriggers,
        failed: failedTriggers,
        successRate: totalTriggers > 0 ? (successfulTriggers / totalTriggers) * 100 : 0,
      },
      performance: {
        averageResponseTime: averageResponseTime._avg.responseTime || 0,
      },
      breakdown: {
        byEvent: eventBreakdown.reduce((acc, item) => {
          acc[item.event] = item._count._all;
          return acc;
        }, {}),
        byStatus: statusBreakdown.reduce((acc, item) => {
          acc[item.status] = item._count._all;
          return acc;
        }, {}),
      },
    };
  }

  /**
   * Get recent failed webhooks
   * @param {number} limit - Number of records to return
   * @param {string} [instanceId] - Optional instance ID filter
   */
  async getRecentFailures(limit = 10, instanceId = null) {
    const whereClause = {
      status: { not: 'success' },
      ...(instanceId && { instanceId }),
    };

    return await prisma.webhookHistory.findMany({
      where: whereClause,
      take: limit,
      orderBy: { triggeredAt: 'desc' },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Clean up old webhook history records
   * @param {number} daysToKeep - Number of days to keep records
   */
  async cleanup(daysToKeep = 30) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = await prisma.webhookHistory.deleteMany({
      where: {
        triggeredAt: { lt: cutoffDate },
      },
    });

    return {
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  /**
   * Update webhook history record (mainly for retry scenarios)
   * @param {string} id - Webhook history ID
   * @param {Object} updateData - Data to update
   */
  async update(id, updateData) {
    return await prisma.webhookHistory.update({
      where: { id },
      data: updateData,
      include: {
        instance: true,
        webhook: true,
      },
    });
  }

  /**
   * Get webhook history by ID
   * @param {string} id - Webhook history ID
   */
  async findById(id) {
    return await prisma.webhookHistory.findUnique({
      where: { id },
      include: {
        instance: true,
        webhook: true,
      },
    });
  }
}

module.exports = new WebhookHistoryService();
