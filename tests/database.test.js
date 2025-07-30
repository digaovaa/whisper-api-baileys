const prisma = require('../src/database/prisma');
const instanceService = require('../src/services/instanceService');
const webhookService = require('../src/services/webhookService');
const messageService = require('../src/services/messageService');

beforeAll(async () => {
  // Connect to the MongoDB database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect from the MongoDB database
  await prisma.$disconnect();
});

describe('Database Service Tests', () => {
  let instance;
  let webhook;
  let message;

  test('Create Instance', async () => {
    instance = await instanceService.create({
      phone: '123456789',
      name: 'Test Instance',
      alias: 'Test',
    });
    expect(instance).toHaveProperty('id');
    expect(instance.phone).toBe('123456789');
  });

  test('Create Webhook', async () => {
    webhook = await webhookService.create({
      instanceId: instance.id,
      type: 'message',
      event: 'received',
      url: 'http://localhost/webhook',
    });
    expect(webhook).toHaveProperty('id');
    expect(webhook.instanceId).toBe(instance.id);
  });

  test('Create Message', async () => {
    message = await messageService.create({
      instanceId: instance.id,
      direction: 'incoming',
      from: '123456789',
      to: '987654321',
      type: 'text',
      message: { content: 'Hello, World!' },
    });
    expect(message).toHaveProperty('id');
  });

  test('Find Instance by ID', async () => {
    const foundInstance = await instanceService.findById(instance.id);
    expect(foundInstance).toBeDefined();
    expect(foundInstance.id).toBe(instance.id);
  });

  test('Find Webhook by ID', async () => {
    const foundWebhook = await webhookService.findById(webhook.id);
    expect(foundWebhook).toBeDefined();
    expect(foundWebhook.id).toBe(webhook.id);
  });

  test('Find Message by ID', async () => {
    const foundMessage = await messageService.findById(message.id);
    expect(foundMessage).toBeDefined();
    expect(foundMessage.id).toBe(message.id);
  });

  test('Update Instance', async () => {
    await instanceService.update(instance.id, { status: 'active' });
    const updatedInstance = await instanceService.findById(instance.id);
    expect(updatedInstance.status).toBe('active');
  });

  test('Update Webhook', async () => {
    await webhookService.toggleEnabled(webhook.id, false);
    const updatedWebhook = await webhookService.findById(webhook.id);
    expect(updatedWebhook.isEnabled).toBe(false);
  });

  test('Update Message Status', async () => {
    await messageService.updateStatus(message.id, 'delivered');
    const updatedMessage = await messageService.findById(message.id);
    expect(updatedMessage.status).toBe('delivered');
  });

  test('Delete Message', async () => {
    await messageService.delete(message.id);
    const deletedMessage = await messageService.findById(message.id);
    expect(deletedMessage).toBeNull();
  });

  test('Delete Webhook', async () => {
    await webhookService.delete(webhook.id);
    const deletedWebhook = await webhookService.findById(webhook.id);
    expect(deletedWebhook).toBeNull();
  });

  test('Delete Instance', async () => {
    await instanceService.delete(instance.id);
    const deletedInstance = await instanceService.findById(instance.id);
    expect(deletedInstance).toBeNull();
  });
});

