const prisma = require('../src/database/prisma');
const instanceService = require('../src/services/instanceService');
const webhookService = require('../src/services/webhookService');
const messageService = require('../src/services/messageService');

describe('Advanced Database Operations Tests', () => {
  let testInstances = [];
  let testWebhooks = [];
  let testMessages = [];

  beforeAll(async () => {
    await prisma.$connect();
    
    // Clean up test data
    await prisma.webhook.deleteMany();
    await prisma.message.deleteMany();
    await prisma.instance.deleteMany();
  });

  afterAll(async () => {
    // Clean up test data after tests
    await prisma.webhook.deleteMany();
    await prisma.message.deleteMany();
    await prisma.instance.deleteMany();
    await prisma.$disconnect();
  });

  describe('Instance Service Advanced Operations', () => {
    test('Create multiple instances', async () => {
      const instances = [
        { phone: '111111111', name: 'Instance 1', alias: 'Test1' },
        { phone: '222222222', name: 'Instance 2', alias: 'Test2' },
        { phone: '333333333', name: 'Instance 3', alias: 'Test3' }
      ];

      for (const instanceData of instances) {
        const instance = await instanceService.create(instanceData);
        testInstances.push(instance);
      }

      expect(testInstances).toHaveLength(3);
    });

    test('Find instance by phone', async () => {
      const instance = await instanceService.findByPhone('111111111');
      expect(instance).toBeDefined();
      expect(instance.phone).toBe('111111111');
    });

    test('Get all instances', async () => {
      const instances = await instanceService.findAll();
      expect(instances.length).toBeGreaterThanOrEqual(3);
    });

    test('Get instance statistics', async () => {
      const stats = await instanceService.getStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('inactive');
      expect(stats.total).toBeGreaterThanOrEqual(3);
    });

    test('Update instance status', async () => {
      const instance = testInstances[0];
      await instanceService.updateStatus(instance.id, 'active');
      
      const updatedInstance = await instanceService.findById(instance.id);
      expect(updatedInstance.status).toBe('active');
    });
  });

  describe('Webhook Service Advanced Operations', () => {
    test('Create webhooks for instances', async () => {
      const webhookData = [
        {
          instanceId: testInstances[0].id,
          type: 'message',
          event: 'received',
          url: 'http://localhost:3000/webhook/message'
        },
        {
          instanceId: testInstances[0].id,
          type: 'status',
          event: 'connection',
          url: 'http://localhost:3000/webhook/status'
        },
        {
          instanceId: testInstances[1].id,
          type: 'message',
          event: 'sent',
          url: 'http://localhost:3000/webhook/sent'
        }
      ];

      for (const data of webhookData) {
        const webhook = await webhookService.create(data);
        testWebhooks.push(webhook);
      }

      expect(testWebhooks).toHaveLength(3);
    });

    test('Find webhooks by instance', async () => {
      const webhooks = await webhookService.findByInstance(testInstances[0].id);
      expect(webhooks).toHaveLength(2);
    });

    test('Find webhooks by type and event', async () => {
      const webhooks = await webhookService.findByTypeAndEvent(
        testInstances[0].id,
        'message',
        'received'
      );
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].type).toBe('message');
      expect(webhooks[0].event).toBe('received');
    });

    test('Get enabled webhooks', async () => {
      const webhooks = await webhookService.getEnabledWebhooks(
        testInstances[0].id,
        'received'
      );
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].isEnabled).toBe(true);
    });
  });

  describe('Message Service Advanced Operations', () => {
    test('Create messages for instances', async () => {
      const messageData = [
        {
          instanceId: testInstances[0].id,
          direction: 'incoming',
          from: '555555555',
          to: testInstances[0].phone,
          type: 'text',
          message: { content: 'Hello from test 1' }
        },
        {
          instanceId: testInstances[0].id,
          direction: 'outgoing',
          from: testInstances[0].phone,
          to: '555555555',
          type: 'text',
          message: { content: 'Reply from test 1' }
        },
        {
          instanceId: testInstances[1].id,
          direction: 'incoming',
          from: '666666666',
          to: testInstances[1].phone,
          type: 'image',
          message: { 
            content: 'Image message',
            media: { url: 'http://example.com/image.jpg' }
          }
        }
      ];

      for (const data of messageData) {
        const message = await messageService.create(data);
        testMessages.push(message);
      }

      expect(testMessages).toHaveLength(3);
    });

    test('Find messages by instance', async () => {
      const messages = await messageService.findByInstance(testInstances[0].id);
      expect(messages).toHaveLength(2);
    });

    test('Find messages with filters', async () => {
      const incomingMessages = await messageService.findByInstance(
        testInstances[0].id,
        { direction: 'incoming' }
      );
      expect(incomingMessages).toHaveLength(1);
      expect(incomingMessages[0].direction).toBe('incoming');

      const textMessages = await messageService.findByInstance(
        testInstances[0].id,
        { type: 'text' }
      );
      expect(textMessages).toHaveLength(2);
    });

    test('Get conversation', async () => {
      const conversation = await messageService.getConversation(
        testInstances[0].id,
        '555555555'
      );
      expect(conversation).toHaveLength(2);
    });

    test('Get message statistics', async () => {
      const stats = await messageService.getStatsByInstance(testInstances[0].id);
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('direction');
      expect(stats).toHaveProperty('status');
      expect(stats.total).toBe(2);
      expect(stats.direction.incoming).toBe(1);
      expect(stats.direction.outgoing).toBe(1);
    });

    test('Get recent messages', async () => {
      const recentMessages = await messageService.getRecentMessages(
        testInstances[0].id,
        1
      );
      expect(recentMessages).toHaveLength(1);
    });
  });

  describe('Database Relationships Tests', () => {
    test('Instance with webhooks and messages', async () => {
      const instance = await instanceService.findById(testInstances[0].id);
      expect(instance).toHaveProperty('webhooks');
      expect(instance.webhooks).toHaveLength(2);
      expect(instance._count.messages).toBe(2);
    });

    test('Webhook with instance', async () => {
      const webhook = await webhookService.findById(testWebhooks[0].id);
      expect(webhook).toHaveProperty('instance');
      expect(webhook.instance.id).toBe(testInstances[0].id);
    });

    test('Message with instance', async () => {
      const message = await messageService.findById(testMessages[0].id);
      expect(message).toHaveProperty('instance');
      expect(message.instance.id).toBe(testInstances[0].id);
    });
  });

  describe('Database Connection and Error Handling', () => {
    test('Database connection is working', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    test('Handle duplicate phone number', async () => {
      await expect(instanceService.create({
        phone: '111111111', // This phone already exists
        name: 'Duplicate Instance'
      })).rejects.toThrow();
    });

    test('Handle non-existent instance ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist
      const result = await instanceService.findById(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('Cascade Delete Tests', () => {
    test('Deleting instance cascades to webhooks and messages', async () => {
      const instanceToDelete = testInstances[2];
      
      // Create a webhook for this instance
      const webhook = await webhookService.create({
        instanceId: instanceToDelete.id,
        type: 'test',
        event: 'test',
        url: 'http://test.com'
      });

      // Create a message for this instance
      const message = await messageService.create({
        instanceId: instanceToDelete.id,
        direction: 'incoming',
        type: 'text',
        message: { content: 'Test cascade' }
      });

      // Delete the instance
      await instanceService.delete(instanceToDelete.id);

      // Check that webhooks and messages are also deleted
      const deletedWebhook = await webhookService.findById(webhook.id);
      const deletedMessage = await messageService.findById(message.id);
      
      expect(deletedWebhook).toBeNull();
      expect(deletedMessage).toBeNull();
    });
  });
});
