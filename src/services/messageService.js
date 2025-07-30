const prisma = require('../database/prisma');

class MessageService {
  /**
   * Create a new message
   * @param {Object} data - Message data
   * @param {string} data.instanceId - Instance ID
   * @param {string} data.direction - Message direction (incoming/outgoing)
   * @param {string} [data.to] - Recipient
   * @param {string} [data.from] - Sender
   * @param {string} data.type - Message type
   * @param {Object} data.message - Message content (JSON)
   * @param {string} [data.status] - Message status
   * @param {Date} [data.sentAt] - Sent timestamp
   */
  async create(data) {
    return await prisma.message.create({
      data: {
        instanceId: data.instanceId,
        direction: data.direction,
        to: data.to,
        from: data.from,
        type: data.type,
        message: data.message,
        status: data.status || 'pending',
        sentAt: data.sentAt,
      },
      include: {
        instance: true,
      },
    });
  }

  /**
   * Get messages for an instance
   * @param {string} instanceId - Instance ID
   * @param {Object} options - Query options
   */
  async findByInstance(instanceId, options = {}) {
    const where = { instanceId };
    
    if (options.direction) {
      where.direction = options.direction;
    }
    
    if (options.type) {
      where.type = options.type;
    }
    
    if (options.status) {
      where.status = options.status;
    }

    if (options.from) {
      where.from = { contains: options.from, mode: 'insensitive' };
    }

    if (options.to) {
      where.to = { contains: options.to, mode: 'insensitive' };
    }

    return await prisma.message.findMany({
      where,
      take: options.take || 50,
      skip: options.skip || 0,
      include: {
        instance: true,
      },
      orderBy: {
        createdAt: options.orderBy || 'desc',
      },
    });
  }

  /**
   * Get all messages
   * @param {Object} options - Query options
   */
  async findAll(options = {}) {
    return await prisma.message.findMany({
      take: options.take || 50,
      skip: options.skip || 0,
      include: {
        instance: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find message by ID
   * @param {string} id - Message ID
   */
  async findById(id) {
    return await prisma.message.findUnique({
      where: { id },
      include: {
        instance: true,
      },
    });
  }

  /**
   * Update message
   * @param {string} id - Message ID
   * @param {Object} data - Update data
   */
  async update(id, data) {
    return await prisma.message.update({
      where: { id },
      data,
      include: {
        instance: true,
      },
    });
  }

  /**
   * Update message status
   * @param {string} id - Message ID
   * @param {string} status - New status
   * @param {Date} [sentAt] - Sent timestamp
   */
  async updateStatus(id, status, sentAt = null) {
    const updateData = { status };
    if (sentAt) {
      updateData.sentAt = sentAt;
    }
    
    return await prisma.message.update({
      where: { id },
      data: updateData,
      include: {
        instance: true,
      },
    });
  }

  /**
   * Delete message
   * @param {string} id - Message ID
   */
  async delete(id) {
    return await prisma.message.delete({
      where: { id },
    });
  }

  /**
   * Get message statistics for an instance
   * @param {string} instanceId - Instance ID
   * @param {Object} options - Query options
   */
  async getStatsByInstance(instanceId, options = {}) {
    const where = { instanceId };
    
    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) {
        where.createdAt.gte = new Date(options.dateFrom);
      }
      if (options.dateTo) {
        where.createdAt.lte = new Date(options.dateTo);
      }
    }

    const [total, incoming, outgoing, pending, sent, delivered, read, failed] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.count({ where: { ...where, direction: 'incoming' } }),
      prisma.message.count({ where: { ...where, direction: 'outgoing' } }),
      prisma.message.count({ where: { ...where, status: 'pending' } }),
      prisma.message.count({ where: { ...where, status: 'sent' } }),
      prisma.message.count({ where: { ...where, status: 'delivered' } }),
      prisma.message.count({ where: { ...where, status: 'read' } }),
      prisma.message.count({ where: { ...where, status: 'failed' } }),
    ]);

    return {
      total,
      direction: {
        incoming,
        outgoing,
      },
      status: {
        pending,
        sent,
        delivered,
        read,
        failed,
      },
    };
  }

  /**
   * Get conversation between two parties
   * @param {string} instanceId - Instance ID
   * @param {string} contact - Contact number
   * @param {Object} options - Query options
   */
  async getConversation(instanceId, contact, options = {}) {
    return await prisma.message.findMany({
      where: {
        instanceId,
        OR: [
          { from: contact },
          { to: contact },
        ],
      },
      take: options.take || 50,
      skip: options.skip || 0,
      include: {
        instance: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get recent messages for dashboard
   * @param {string} instanceId - Instance ID
   * @param {number} limit - Number of messages to fetch
   */
  async getRecentMessages(instanceId, limit = 10) {
    return await prisma.message.findMany({
      where: { instanceId },
      take: limit,
      include: {
        instance: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

module.exports = new MessageService();
