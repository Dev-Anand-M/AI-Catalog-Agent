const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Counter for unique emails
let emailCounter = 5000;

describe('Cascade Property Tests', () => {
  beforeEach(async () => {
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * **Feature: digital-catalog-landing, Property 15: User Cascade Deletion**
   * **Validates: Requirements 8.3**
   * 
   * For any user deletion, all products associated with that user 
   * SHALL also be deleted from the database.
   */
  test('Property 15: User Cascade Deletion - deleting user deletes their products', async () => {
    // Create a user
    const email = `cascade${++emailCounter}@test.com`;
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test User',
        email,
        password: 'testpassword123',
        confirmPassword: 'testpassword123'
      });

    expect(signupResponse.status).toBe(201);
    const token = signupResponse.body.token;
    const userId = signupResponse.body.user.id;

    // Create products for the user
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Product 1',
        description: 'Test product 1',
        category: 'Grocery',
        price: 100,
        language: 'English'
      });

    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Product 2',
        description: 'Test product 2',
        category: 'Clothing',
        price: 200,
        language: 'Hindi'
      });

    // Verify products exist
    const productsBefore = await prisma.product.findMany({
      where: { userId }
    });
    expect(productsBefore.length).toBe(2);

    // Delete the user directly from database (simulating cascade)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Verify products are also deleted (cascade)
    const productsAfter = await prisma.product.findMany({
      where: { userId }
    });
    expect(productsAfter.length).toBe(0);
  });
});
