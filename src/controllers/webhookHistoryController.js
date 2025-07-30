const webhookHistoryService = require('../services/webhookHistoryService');
const instanceService = require('../services/instanceService');
const { validationResult } = require('express-validator');

class WebhookHistoryController {
  /**
   * Get webhook history for a specific instance
   */
  async getInstanceHistory(req, res) {
    try {
      const { instanceId } = req.params;
      const { 
        limit = 50, 
        skip = 0, 
        status, 
        event, 
        startDate, 
        endDate 
      } = req.query;

      let history;

      if (startDate && endDate) {
        history = await webhookHistoryService.findByDateRange(
          new Date(startDate),
          new Date(endDate),
          { take: parseInt(limit), skip: parseInt(skip) }
        );
        // Filter by instance if needed
        history = history.filter(h => h.instanceId === instanceId);
      } else if (status) {
        history = await webhookHistoryService.findByStatus(status, { 
          take: parseInt(limit), 
          skip: parseInt(skip) 
        });
        history = history.filter(h => h.instanceId === instanceId);
      } else if (event) {
        history = await webhookHistoryService.findByEvent(event, { 
          take: parseInt(limit), 
          skip: parseInt(skip) 
        });
        history = history.filter(h => h.instanceId === instanceId);
      } else {
        history = await webhookHistoryService.findByInstance(instanceId, { 
          take: parseInt(limit), 
          skip: parseInt(skip) 
        });
      }

      res.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook history for a specific webhook
   */
  async getWebhookHistory(req, res) {
    try {
      const { webhookId } = req.params;
      const { 
        limit = 50, 
        skip = 0 
      } = req.query;

      const history = await webhookHistoryService.findByWebhook(webhookId, { 
        take: parseInt(limit), 
        skip: parseInt(skip) 
      });

      res.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook history statistics
   */
  async getStatistics(req, res) {
    try {
      const { instanceId } = req.params;
      const { timeframe = 'day' } = req.query;

      const stats = await webhookHistoryService.getStatistics(instanceId, timeframe);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get global webhook statistics (all instances)
   */
  async getGlobalStatistics(req, res) {
    try {
      const { timeframe = 'day' } = req.query;

      const stats = await webhookHistoryService.getStatistics(null, timeframe);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get recent webhook failures
   */
  async getRecentFailures(req, res) {
    try {
      const { instanceId } = req.params;
      const { limit = 10 } = req.query;

      const failures = await webhookHistoryService.getRecentFailures(
        parseInt(limit), 
        instanceId
      );

      res.json({
        success: true,
        data: failures,
        meta: {
          count: failures.length,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get global recent webhook failures
   */
  async getGlobalRecentFailures(req, res) {
    try {
      const { limit = 10 } = req.query;

      const failures = await webhookHistoryService.getRecentFailures(parseInt(limit));

      res.json({
        success: true,
        data: failures,
        meta: {
          count: failures.length,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook history by ID
   */
  async getHistoryById(req, res) {
    try {
      const { historyId } = req.params;

      const history = await webhookHistoryService.findById(historyId);

      if (!history) {
        return res.status(404).json({
          success: false,
          error: 'Webhook history record not found'
        });
      }

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Clean up old webhook history records
   */
  async cleanup(req, res) {
    try {
      const { daysToKeep = 30 } = req.body;

      const result = await webhookHistoryService.cleanup(parseInt(daysToKeep));

      res.json({
        success: true,
        message: `Cleaned up ${result.deletedCount} old webhook history records`,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook history by event type
   */
  async getByEvent(req, res) {
    try {
      const { event } = req.params;
      const { 
        limit = 50, 
        skip = 0,
        instanceId 
      } = req.query;

      let history = await webhookHistoryService.findByEvent(event, { 
        take: parseInt(limit), 
        skip: parseInt(skip) 
      });

      // Filter by instance if provided
      if (instanceId) {
        history = history.filter(h => h.instanceId === instanceId);
      }

      res.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          limit: parseInt(limit),
          skip: parseInt(skip),
          event: event
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook history by status
   */
  async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const { 
        limit = 50, 
        skip = 0,
        instanceId 
      } = req.query;

      let history = await webhookHistoryService.findByStatus(status, { 
        take: parseInt(limit), 
        skip: parseInt(skip) 
      });

      // Filter by instance if provided
      if (instanceId) {
        history = history.filter(h => h.instanceId === instanceId);
      }

      res.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          limit: parseInt(limit),
          skip: parseInt(skip),
          status: status
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Phone-based methods for instance-specific routes

  /**
   * Get webhook history for instance by phone number
   */
  async getInstanceHistoryByPhone(req, res) {
    try {
      const { phone } = req.params;
      
      // Get instance by phone
      const instance = await instanceService.findByPhone(phone);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instance not found'
        });
      }

      // Set instanceId and call existing method
      req.params.instanceId = instance.id;
      return await this.getInstanceHistory(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get webhook statistics for instance by phone number
   */
  async getInstanceStatsByPhone(req, res) {
    try {
      const { phone } = req.params;
      
      // Get instance by phone
      const instance = await instanceService.findByPhone(phone);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instance not found'
        });
      }

      // Set instanceId and call existing method
      req.params.instanceId = instance.id;
      return await this.getStatistics(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get recent failures for instance by phone number
   */
  async getInstanceFailuresByPhone(req, res) {
    try {
      const { phone } = req.params;
      
      // Get instance by phone
      const instance = await instanceService.findByPhone(phone);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instance not found'
        });
      }

      // Set instanceId and call existing method
      req.params.instanceId = instance.id;
      return await this.getRecentFailures(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get global webhook history (for admin endpoints)
   */
  async getGlobalHistory(req, res) {
    try {
      const { 
        limit = 50, 
        skip = 0, 
        status, 
        event, 
        startDate, 
        endDate,
        instanceId
      } = req.query;

      let history;

      if (startDate && endDate) {
        history = await webhookHistoryService.findByDateRange(
          new Date(startDate),
          new Date(endDate),
          { take: parseInt(limit), skip: parseInt(skip) }
        );
        if (instanceId) history = history.filter(h => h.instanceId === instanceId);
      } else if (status) {
        history = await webhookHistoryService.findByStatus(status, { 
          take: parseInt(limit), 
          skip: parseInt(skip) 
        });
        if (instanceId) history = history.filter(h => h.instanceId === instanceId);
      } else if (event) {
        history = await webhookHistoryService.findByEvent(event, { 
          take: parseInt(limit), 
          skip: parseInt(skip) 
        });
        if (instanceId) history = history.filter(h => h.instanceId === instanceId);
      } else {
        // Get all webhook history across all instances
        const allInstances = await instanceService.findAll();
        history = [];
        
        for (const instance of allInstances) {
          const instanceHistory = await webhookHistoryService.findByInstance(instance.id, { 
            take: parseInt(limit), 
            skip: parseInt(skip) 
          });
          history = history.concat(instanceHistory);
        }
        
        // Sort by triggeredAt descending and apply pagination
        history.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
        history = history.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
      }

      res.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new WebhookHistoryController();
