const prisma = require('../database/prisma');

class InstanceService {
  /**
   * Create a new instance
   * @param {Object} data - Instance data
   * @param {string} data.phone - Phone number
   * @param {string} data.name - Instance name
   * @param {string} [data.alias] - Instance alias
   * @param {string} [data.status] - Instance status
   */
  async create(data) {
    return await prisma.instance.create({
      data: {
        phone: data.phone,
        name: data.name,
        alias: data.alias,
        status: data.status || 'inactive',
        pluginConfig: data.pluginConfig || {},
      },
    });
  }

  /**
   * Get all instances
   * @param {Object} options - Query options
   * @param {number} [options.take] - Number of records to take
   * @param {number} [options.skip] - Number of records to skip
   */
  async findAll(options = {}) {
    return await prisma.instance.findMany({
      take: options.take,
      skip: options.skip,
      include: {
        webhooks: true,
        _count: {
          select: {
            messages: true,
            webhooks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find instance by ID
   * @param {string} id - Instance ID
   */
  async findById(id) {
    return await prisma.instance.findUnique({
      where: { id },
      include: {
        webhooks: true,
        _count: {
          select: {
            messages: true,
            webhooks: true,
          },
        },
      },
    });
  }

  /**
   * Find instance by phone number
   * @param {string} phone - Phone number
   */
  async findByPhone(phone) {
    return await prisma.instance.findUnique({
      where: { phone },
      include: {
        webhooks: true,
      },
    });
  }

  /**
   * Update instance
   * @param {string} id - Instance ID
   * @param {Object} data - Update data
   */
  async update(id, data) {
    return await prisma.instance.update({
      where: { id },
      data,
    });
  }

  /**
   * Update instance status
   * @param {string} id - Instance ID
   * @param {string} status - New status
   */
  async updateStatus(id, status) {
    return await prisma.instance.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Delete instance
   * @param {string} id - Instance ID
   */
  async delete(id) {
    return await prisma.instance.delete({
      where: { id },
    });
  }

  /**
   * Get instance statistics
   */
  async getStats() {
    const [total, active, inactive] = await Promise.all([
      prisma.instance.count(),
      prisma.instance.count({ where: { status: 'active' } }),
      prisma.instance.count({ where: { status: 'inactive' } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}

module.exports = new InstanceService();
