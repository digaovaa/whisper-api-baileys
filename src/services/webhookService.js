const prisma = require('../database/prisma');

class WebhookService {
  /**
   * Create a new webhook
   * @param {Object} data - Webhook data
   * @param {string} data.instanceId - Instance ID
   * @param {string} data.type - Webhook type
   * @param {string} data.event - Webhook event
   * @param {string} data.url - Webhook URL
   * @param {boolean} [data.isEnabled] - Whether webhook is enabled
   */
  async create(data) {
    return await prisma.webhook.create({
      data: {
        instanceId: data.instanceId,
        type: data.type,
        event: data.event,
        url: data.url,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
      },
      include: {
        instance: true,
      },
    });
  }

  /**
   * Get all webhooks for an instance
   * @param {string} instanceId - Instance ID
   * @param {Object} options - Query options
   */
  async findByInstance(instanceId, options = {}) {
    return await prisma.webhook.findMany({
      where: { instanceId },
      take: options.take,
      skip: options.skip,
      include: {
        instance: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all webhooks
   * @param {Object} options - Query options
   */
  async findAll(options = {}) {
    return await prisma.webhook.findMany({
      take: options.take,
      skip: options.skip,
      include: {
        instance: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find webhook by ID
   * @param {string} id - Webhook ID
   */
  async findById(id) {
    return await prisma.webhook.findUnique({
      where: { id },
      include: {
        instance: true,
      },
    });
  }

  /**
   * Find webhooks by type and event
   * @param {string} instanceId - Instance ID
   * @param {string} type - Webhook type
   * @param {string} event - Webhook event
   */
  async findByTypeAndEvent(instanceId, type, event) {
    return await prisma.webhook.findMany({
      where: {
        instanceId,
        type,
        event,
        isEnabled: true,
      },
      include: {
        instance: true,
      },
    });
  }

  /**
   * Update webhook
   * @param {string} id - Webhook ID
   * @param {Object} data - Update data
   */
  async update(id, data) {
    return await prisma.webhook.update({
      where: { id },
      data,
      include: {
        instance: true,
      },
    });
  }

  /**
   * Toggle webhook enabled status
   * @param {string} id - Webhook ID
   * @param {boolean} isEnabled - Enable/disable webhook
   */
  async toggleEnabled(id, isEnabled) {
    return await prisma.webhook.update({
      where: { id },
      data: { isEnabled },
      include: {
        instance: true,
      },
    });
  }

  /**
   * Delete webhook
   * @param {string} id - Webhook ID
   */
  async delete(id) {
    return await prisma.webhook.delete({
      where: { id },
    });
  }

  /**
   * Get enabled webhooks for triggering
   * @param {string} instanceId - Instance ID
   * @param {string} event - Event type
   */
  async getEnabledWebhooks(instanceId, event) {
    return await prisma.webhook.findMany({
      where: {
        instanceId,
        event,
        isEnabled: true,
      },
      include: {
        instance: true,
      },
    });
  }
}

module.exports = new WebhookService();
