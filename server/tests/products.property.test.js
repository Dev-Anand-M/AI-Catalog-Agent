const fc = require('fast-check');
const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Counter for unique emails
let emailCounter = 1000;

// Helper generators
const validEmail = () => fc.constant(null).map(() => `producttest${++emailCounter}@test.com`);

const validPassword = () => fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
  { minLength: 8, maxLength: 20 }
);

const validName = () => fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '),
  { minLength: 2, maxLength: 30 }
).filter(s => s.trim().length > 0 && /^[a-zA-Z]/.test(s));

const validProductName = () => fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '),
  { minLength: 2, maxLength: 50 }
).filter(s => s.trim().length > 0);

const validDescription = () => fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!'),
  { minLength: 5, maxLength: 200 }
).filter(s => s.trim().length > 0);

const validCategory = () => fc.constantFrom('Grocery', 'Clothing', 'Handicraft', 'Electronics', 'Other');

const validLanguage = () => fc.constantFrom('English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali');

const validPrice = () => fc.integer({ min: 1, max: 100000 }).map(n => n / 100);

const invalidPrice = () => fc.oneof(
  fc.constant(0),
  fc.constant(-1),
  fc.float({ min: -1000, max: 0, noNaN: true })
);

// Helper to create user and get token
async function createUserAndGetToken() {
  const email = `producttest${++emailCounter}@test.com`;
  const password = 'testpassword123';
  const name = 'Test User';

  const response = await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password, confirmPassword: password });

  return { token: response.body.token, userId: response.body.user?.id };
}

describe('Product Property Tests', () => {
  beforeEach(async () => {
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * **Feature: digital-catalog-landing, Property 10: Required Fields Validation**
   * **Validates: Requirements 4.8**
   * 
   * For any product creation request missing required fields (name, description, 
   * category, price, language), the system SHALL reject the request with specific 
   * validation errors for each missing field.
   */
  test('Property 10: Required Fields Validation - reject missing required fields', async () => {
    const { token } = await createUserAndGetToken();

    // Test missing each required field
    const requiredFields = ['name', 'description', 'category', 'price', 'language'];
    
    for (const missingField of requiredFields) {
      const validProduct = {
        name: 'Test Product',
        description: 'Test description',
        category: 'Grocery',
        price: 100,
        language: 'English'
      };
      
      delete validProduct[missingField];

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(validProduct);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[missingField]).toBeDefined();
    }
  });

  /**
   * **Feature: digital-catalog-landing, Property 9: Price Validation**
   * **Validates: Requirements 4.9**
   * 
   * For any product creation or update request with price <= 0, 
   * the system SHALL reject the request with a validation error.
   */
  test('Property 9: Price Validation - reject invalid prices', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidPrice(),
        async (price) => {
          const { token } = await createUserAndGetToken();

          const response = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({
              name: 'Test Product',
              description: 'Test description',
              category: 'Grocery',
              price,
              language: 'English'
            });

          expect(response.status).toBe(400);
          expect(response.body.details.price).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});


  /**
   * **Feature: digital-catalog-landing, Property 6: Product Ownership Isolation**
   * **Validates: Requirements 3.1, 7.3**
   * 
   * For any authenticated user, the GET /api/products endpoint SHALL return 
   * only products where userId matches the authenticated user's id.
   */
  test('Property 6: Product Ownership Isolation - users only see their own products', async () => {
    // Create two users
    const { token: token1 } = await createUserAndGetToken();
    const { token: token2 } = await createUserAndGetToken();

    // User 1 creates products
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        name: 'User1 Product',
        description: 'Product by user 1',
        category: 'Grocery',
        price: 100,
        language: 'English'
      });

    // User 2 creates products
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        name: 'User2 Product',
        description: 'Product by user 2',
        category: 'Clothing',
        price: 200,
        language: 'Hindi'
      });

    // User 1 should only see their products
    const user1Products = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token1}`);

    expect(user1Products.status).toBe(200);
    expect(user1Products.body.length).toBe(1);
    expect(user1Products.body[0].name).toBe('User1 Product');

    // User 2 should only see their products
    const user2Products = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token2}`);

    expect(user2Products.status).toBe(200);
    expect(user2Products.body.length).toBe(1);
    expect(user2Products.body[0].name).toBe('User2 Product');
  });


  /**
   * **Feature: digital-catalog-landing, Property 5: Product CRUD Persistence**
   * **Validates: Requirements 4.1, 4.6, 7.4, 7.5, 8.2**
   * 
   * For any valid product data, creating a product and then retrieving it 
   * SHALL return the same data that was submitted (round-trip consistency).
   */
  test('Property 5: Product CRUD Persistence - create and retrieve returns same data', async () => {
    await fc.assert(
      fc.asyncProperty(
        validProductName(),
        validDescription(),
        validCategory(),
        validPrice(),
        validLanguage(),
        async (name, description, category, price, language) => {
          const { token } = await createUserAndGetToken();

          // Create product
          const createResponse = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, description, category, price, language });

          expect(createResponse.status).toBe(201);
          const productId = createResponse.body.id;

          // Retrieve product
          const getResponse = await request(app)
            .get(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${token}`);

          expect(getResponse.status).toBe(200);
          expect(getResponse.body.name).toBe(name.trim());
          expect(getResponse.body.description).toBe(description.trim());
          expect(getResponse.body.category).toBe(category.trim());
          expect(getResponse.body.language).toBe(language.trim());
          // Price comparison with tolerance for floating point
          expect(Math.abs(getResponse.body.price - price)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: digital-catalog-landing, Property 8: Product Deletion Consistency**
   * **Validates: Requirements 4.7, 7.6**
   * 
   * For any product that is deleted, subsequent GET requests for that product 
   * SHALL return a 404 Not Found response.
   */
  test('Property 8: Product Deletion Consistency - deleted products return 404', async () => {
    const { token } = await createUserAndGetToken();

    // Create product
    const createResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Product to Delete',
        description: 'This will be deleted',
        category: 'Grocery',
        price: 100,
        language: 'English'
      });

    expect(createResponse.status).toBe(201);
    const productId = createResponse.body.id;

    // Verify it exists
    const getBeforeDelete = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getBeforeDelete.status).toBe(200);

    // Delete product
    const deleteResponse = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteResponse.status).toBe(200);

    // Verify it's gone
    const getAfterDelete = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getAfterDelete.status).toBe(404);
  });
