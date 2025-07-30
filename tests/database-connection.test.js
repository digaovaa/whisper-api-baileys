const prisma = require('../src/database/prisma');

describe('Database Connection Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Database connection is working', async () => {
    // Test basic database connection by pinging
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      expect(true).toBe(true); // If we get here, connection is working
    } catch (error) {
      fail(`Database connection failed: ${error.message}`);
    }
  });

  test('Can create and read a simple instance', async () => {
    const testPhone = Date.now().toString(); // Use timestamp to ensure uniqueness
    
    // Create instance
    const instance = await prisma.instance.create({
      data: {
        phone: testPhone,
        name: 'Test Instance',
        alias: 'Test',
        status: 'active'
      }
    });

    expect(instance).toHaveProperty('id');
    expect(instance.phone).toBe(testPhone);
    expect(instance.name).toBe('Test Instance');

    // Find instance
    const foundInstance = await prisma.instance.findUnique({
      where: { id: instance.id }
    });

    expect(foundInstance).toBeDefined();
    expect(foundInstance.phone).toBe(testPhone);

    // Cleanup - delete the test instance
    await prisma.instance.delete({
      where: { id: instance.id }
    });
  });

  test('Can handle ObjectId format', async () => {
    const testPhone = Date.now().toString();
    
    const instance = await prisma.instance.create({
      data: {
        phone: testPhone,
        name: 'ObjectId Test',
        status: 'active'
      }
    });

    // Test that ID is in MongoDB ObjectId format (24 character hex string)
    expect(instance.id).toMatch(/^[a-f\d]{24}$/i);

    // Cleanup
    await prisma.instance.delete({
      where: { id: instance.id }
    });
  });

  test('Database schema validation works', async () => {
    // Test that required fields are enforced
    await expect(prisma.instance.create({
      data: {
        // Missing required 'name' field
        phone: Date.now().toString()
      }
    })).rejects.toThrow();
  });
});
