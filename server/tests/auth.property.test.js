const fc = require('fast-check');
const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Counter for unique emails
let emailCounter = 0;

// Helper to generate valid email (unique per test)
const validEmail = () => fc.tuple(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 5, maxLength: 10 })
).map(([local]) => `${local}${++emailCounter}@test.com`);

// Helper to generate valid password (8+ chars)
const validPassword = () => fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
  { minLength: 8, maxLength: 20 }
);

// Helper to generate valid name (alphanumeric with spaces)
const validName = () => fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '),
  { minLength: 2, maxLength: 30 }
).filter(s => s.trim().length > 0 && /^[a-zA-Z]/.test(s));

describe('Auth Property Tests', () => {
  beforeEach(async () => {
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * **Feature: digital-catalog-landing, Property 11: Password Hashing**
   * **Validates: Requirements 8.4**
   * 
   * For any user stored in the database, the passwordHash field SHALL NOT 
   * equal the original plain text password.
   */
  test('Property 11: Password Hashing - stored hash never equals plaintext', async () => {
    await fc.assert(
      fc.asyncProperty(
        validName(),
        validEmail(),
        validPassword(),
        async (name, email, password) => {
          // Signup user
          const response = await request(app)
            .post('/api/auth/signup')
            .send({ name, email, password, confirmPassword: password });

          if (response.status === 201) {
            // Fetch user from database
            const user = await prisma.user.findUnique({
              where: { email: email.toLowerCase() }
            });

            // Password hash must NOT equal plaintext password
            expect(user.passwordHash).not.toBe(password);
            
            // Verify hash is valid bcrypt hash
            const isValid = await bcrypt.compare(password, user.passwordHash);
            expect(isValid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


  /**
   * **Feature: digital-catalog-landing, Property 2: Password Mismatch Validation**
   * **Validates: Requirements 2.2**
   * 
   * For any signup attempt where password and confirmPassword fields differ,
   * the system SHALL reject the request and return a validation error.
   */
  test('Property 2: Password Mismatch Validation - mismatched passwords rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        validName(),
        validEmail(),
        validPassword(),
        validPassword(),
        async (name, email, password1, password2) => {
          // Only test when passwords are different
          fc.pre(password1 !== password2);

          const response = await request(app)
            .post('/api/auth/signup')
            .send({ 
              name, 
              email, 
              password: password1, 
              confirmPassword: password2 
            });

          // Should be rejected with 400
          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Validation failed');
          expect(response.body.details.confirmPassword).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: digital-catalog-landing, Property 1: Authentication Round-Trip**
   * **Validates: Requirements 2.1, 2.4, 2.6, 7.1, 7.2**
   * 
   * For any valid user credentials (email and password), signing up and then 
   * logging in with those credentials SHALL return a valid JWT token that can 
   * be used to access protected resources.
   */
  test('Property 1: Authentication Round-Trip - signup then login returns valid token', async () => {
    await fc.assert(
      fc.asyncProperty(
        validName(),
        validEmail(),
        validPassword(),
        async (name, email, password) => {
          // Step 1: Signup
          const signupResponse = await request(app)
            .post('/api/auth/signup')
            .send({ name, email, password, confirmPassword: password });

          expect(signupResponse.status).toBe(201);
          expect(signupResponse.body.token).toBeDefined();

          // Step 2: Login with same credentials
          const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          expect(loginResponse.status).toBe(200);
          expect(loginResponse.body.token).toBeDefined();

          // Step 3: Use token to access protected resource
          const meResponse = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${loginResponse.body.token}`);

          expect(meResponse.status).toBe(200);
          expect(meResponse.body.user.email).toBe(email.toLowerCase());
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: digital-catalog-landing, Property 4: Invalid Credentials Rejection**
   * **Validates: Requirements 2.5**
   * 
   * For any login attempt with credentials that don't match a valid user, 
   * the system SHALL reject the request without revealing which field 
   * (email or password) is incorrect.
   */
  test('Property 4: Invalid Credentials Rejection - generic error on invalid login', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmail(),
        validPassword(),
        async (email, password) => {
          // Try to login with credentials that don't exist
          const response = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          // Should be rejected with 401
          expect(response.status).toBe(401);
          
          // Error message should be generic (not revealing which field is wrong)
          expect(response.body.error).toBe('Invalid credentials');
          
          // Should NOT have details about which field is wrong
          expect(response.body.details).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: digital-catalog-landing, Property 7: Authorization Enforcement**
   * **Validates: Requirements 3.5, 7.9**
   * 
   * For any request to a protected endpoint without a valid JWT token, 
   * the system SHALL return a 401 Unauthorized response.
   */
  test('Property 7: Authorization Enforcement - 401 on missing/invalid token', async () => {
    const protectedEndpoints = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'get', path: '/api/products' },
      { method: 'post', path: '/api/products' },
    ];

    // Test with no token
    for (const endpoint of protectedEndpoints) {
      const response = await request(app)[endpoint.method](endpoint.path);
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    }

    // Test with invalid tokens
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (invalidToken) => {
          for (const endpoint of protectedEndpoints) {
            const response = await request(app)
              [endpoint.method](endpoint.path)
              .set('Authorization', `Bearer ${invalidToken}`);

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Unauthorized');
          }
        }
      ),
      { numRuns: 20 }
    );
  });


  /**
   * **Feature: digital-catalog-landing, Property 3: Duplicate Email Prevention**
   * **Validates: Requirements 2.3**
   * 
   * For any signup attempt with an email that already exists in the database, 
   * the system SHALL reject the request and return an appropriate error.
   */
  test('Property 3: Duplicate Email Prevention - reject duplicate emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        validName(),
        validEmail(),
        validPassword(),
        validName(),
        validPassword(),
        async (name1, email, password1, name2, password2) => {
          // First signup should succeed
          const firstResponse = await request(app)
            .post('/api/auth/signup')
            .send({ name: name1, email, password: password1, confirmPassword: password1 });

          expect(firstResponse.status).toBe(201);

          // Second signup with same email should fail
          const secondResponse = await request(app)
            .post('/api/auth/signup')
            .send({ name: name2, email, password: password2, confirmPassword: password2 });

          expect(secondResponse.status).toBe(400);
          expect(secondResponse.body.error).toBe('Validation failed');
          expect(secondResponse.body.details.email).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });
