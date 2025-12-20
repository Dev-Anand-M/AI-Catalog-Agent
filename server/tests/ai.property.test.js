const fc = require('fast-check');
const request = require('supertest');
const app = require('../src/index');

describe('AI Property Tests', () => {
  /**
   * **Feature: digital-catalog-landing, Property 12: AI Generation Response Structure**
   * **Validates: Requirements 5.2, 7.8**
   * 
   * For any request to the AI generation endpoint with valid promptText and language, 
   * the response SHALL contain name, description, and category fields.
   */
  test('Property 12: AI Generation Response Structure - response contains required fields', async () => {
    const validLanguages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.constantFrom(...validLanguages),
        async (promptText, language) => {
          const response = await request(app)
            .post('/api/ai/generate-product')
            .send({ promptText, language });

          expect(response.status).toBe(200);
          
          // Response must contain all required fields
          expect(response.body).toHaveProperty('name');
          expect(response.body).toHaveProperty('description');
          expect(response.body).toHaveProperty('category');
          
          // Fields must be non-empty strings
          expect(typeof response.body.name).toBe('string');
          expect(typeof response.body.description).toBe('string');
          expect(typeof response.body.category).toBe('string');
          expect(response.body.name.length).toBeGreaterThan(0);
          expect(response.body.description.length).toBeGreaterThan(0);
          expect(response.body.category.length).toBeGreaterThan(0);
          
          // Category must be one of the valid categories
          const validCategories = ['Grocery', 'Clothing', 'Handicraft', 'Electronics', 'Other'];
          expect(validCategories).toContain(response.body.category);
        }
      ),
      { numRuns: 50 }
    );
  });
});
