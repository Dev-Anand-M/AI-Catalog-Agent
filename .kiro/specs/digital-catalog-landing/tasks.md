# Implementation Plan

- [x] 1. Project Setup and Configuration





  - [x] 1.1 Initialize monorepo structure with root package.json


    - Create root package.json with workspaces for client and server
    - Add scripts for running both frontend and backend
    - _Requirements: 11.1_

  - [x] 1.2 Set up Express backend with Prisma

    - Initialize server package with Express, Prisma, and dependencies
    - Configure Prisma schema with User and Product models
    - Set up SQLite database and run initial migration
    - _Requirements: 8.1, 8.2_
  - [x] 1.3 Set up React frontend with Tailwind CSS


    - Initialize Vite React project
    - Configure Tailwind CSS with custom color palette (teal primary, orange accent)
    - Set up React Router for navigation
    - _Requirements: 9.2, 9.5_

- [x] 2. Backend Authentication System



  - [x] 2.1 Implement user signup endpoint

    - Create POST /api/auth/signup route
    - Implement password hashing with bcrypt
    - Add validation for name, email, password, confirmPassword
    - Return JWT token on successful signup
    - _Requirements: 2.1, 2.2, 7.1, 8.4_
  - [x] 2.2 Write property test for password hashing


    - **Property 11: Password Hashing**
    - **Validates: Requirements 8.4**
  - [x] 2.3 Write property test for password mismatch validation


    - **Property 2: Password Mismatch Validation**
    - **Validates: Requirements 2.2**
  - [x] 2.4 Implement user login endpoint


    - Create POST /api/auth/login route
    - Verify password against stored hash
    - Return JWT token on successful login
    - Return generic error on invalid credentials
    - _Requirements: 2.4, 2.5, 7.2_
  - [x] 2.5 Write property test for authentication round-trip


    - **Property 1: Authentication Round-Trip**
    - **Validates: Requirements 2.1, 2.4, 2.6, 7.1, 7.2**
  - [x] 2.6 Write property test for invalid credentials rejection


    - **Property 4: Invalid Credentials Rejection**
    - **Validates: Requirements 2.5**
  - [x] 2.7 Implement auth middleware for protected routes


    - Create JWT verification middleware
    - Extract user ID from token and attach to request
    - Return 401 for invalid/missing tokens
    - _Requirements: 3.5, 7.9_
  - [x] 2.8 Write property test for authorization enforcement


    - **Property 7: Authorization Enforcement**
    - **Validates: Requirements 3.5, 7.9**

  - [x] 2.9 Write property test for duplicate email prevention

    - **Property 3: Duplicate Email Prevention**
    - **Validates: Requirements 2.3**

- [x] 3. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend Product CRUD API


  - [x] 4.1 Implement create product endpoint
    - Create POST /api/products route (protected)
    - Validate required fields and price > 0
    - Handle image upload with multer
    - Associate product with authenticated user
    - _Requirements: 4.1, 4.2, 7.4, 8.2_

  - [x] 4.2 Write property test for required fields validation

    - **Property 10: Required Fields Validation**
    - **Validates: Requirements 4.8**
  - [x] 4.3 Write property test for price validation

    - **Property 9: Price Validation**
    - **Validates: Requirements 4.9**
  - [x] 4.4 Implement list products endpoint

    - Create GET /api/products route (protected)
    - Return only products belonging to authenticated user
    - _Requirements: 3.1, 7.3_

  - [x] 4.5 Write property test for product ownership isolation

    - **Property 6: Product Ownership Isolation**
    - **Validates: Requirements 3.1, 7.3**
  - [x] 4.6 Implement update product endpoint

    - Create PUT /api/products/:id route (protected)
    - Verify product belongs to authenticated user
    - Update product fields
    - _Requirements: 4.6, 7.5_

  - [x] 4.7 Implement delete product endpoint
    - Create DELETE /api/products/:id route (protected)
    - Verify product belongs to authenticated user
    - Delete product from database
    - _Requirements: 4.7, 7.6_

  - [x] 4.8 Write property test for product CRUD persistence

    - **Property 5: Product CRUD Persistence**
    - **Validates: Requirements 4.1, 4.6, 7.4, 7.5, 8.2**
  - [x] 4.9 Write property test for product deletion consistency

    - **Property 8: Product Deletion Consistency**
    - **Validates: Requirements 4.7, 7.6**

- [x] 5. Backend Demo and AI Endpoints



  - [x] 5.1 Implement demo products endpoint

    - Create GET /api/demo/products route (public)
    - Return seed demo catalog data
    - _Requirements: 6.4, 7.7_
  - [x] 5.2 Implement AI mock generation endpoint

    - Create POST /api/ai/generate-product route
    - Accept promptText and language
    - Return mock-generated name, description, category
    - _Requirements: 5.1, 5.2, 7.8_

  - [x] 5.3 Write property test for AI generation response structure

    - **Property 12: AI Generation Response Structure**
    - **Validates: Requirements 5.2, 7.8**

  - [x] 5.4 Seed demo data in database
    - Create seed script with sample products
    - Include variety of categories and languages
    - _Requirements: 6.1_

- [x] 6. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend Core Components

  - [x] 7.1 Create base UI components


    - Implement Button component with variants (primary, secondary, outline)
    - Implement Input component with label and error display
    - Implement Select component for dropdowns
    - Implement Card component with rounded corners
    - Implement Alert component for messages
    - _Requirements: 9.1, 9.2_


  - [x] 7.2 Create layout components
    - Implement Navbar with logo and navigation links
    - Implement Footer with links and disclaimer
    - Implement Container for max-width wrapper

    - _Requirements: 1.1, 8.1, 8.2, 8.3_
  - [x] 7.3 Set up auth context and protected routes

    - Create AuthContext for user state management
    - Implement ProtectedRoute component
    - Handle token storage and retrieval
    - _Requirements: 3.5_

  - [x] 7.4 Create API client functions

    - Set up Axios instance with base URL
    - Add auth token interceptor
    - Create functions for all API endpoints
    - _Requirements: 7.1-7.9_

- [x] 8. Frontend Landing Page


  - [x] 8.1 Implement Landing page


    - Create hero section with title, subtitle, and CTAs
    - Create problem section with three cards
    - Create solution section explaining features
    - Add navigation to signup and demo
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_


- [x] 9. Frontend Authentication Pages


  - [x] 9.1 Implement Signup page

    - Create signup form with validation
    - Handle form submission and API call
    - Display validation errors
    - Redirect to dashboard on success
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 9.2 Implement Login page

    - Create login form with validation
    - Handle form submission and API call
    - Display error messages
    - Redirect to dashboard on success
    - _Requirements: 2.4, 2.5_

- [x] 10. Frontend Dashboard and Product Management


  - [x] 10.1 Implement Dashboard page

    - Display product list in table/grid format
    - Show product name, category, price, description, language
    - Add "Add Product" button
    - Add "Export Catalog" placeholder button
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ] 10.2 Write property test for product display completeness
    - **Property 13: Product Display Completeness**

    - **Validates: Requirements 3.2, 6.2**

  - [x] 10.3 Implement Add Product page
    - Create product form with all fields
    - Implement category and language dropdowns
    - Add image upload with preview
    - Implement AI generation section
    - Handle form submission

    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.3_
  - [x] 10.4 Implement Edit Product functionality
    - Load existing product data into form
    - Handle update submission
    - _Requirements: 4.6_

  - [x] 10.5 Implement Delete Product functionality
    - Add delete button to product cards/rows
    - Show confirmation dialog
    - Handle delete API call
    - _Requirements: 4.7_

- [x] 11. Frontend Demo Page




  - [x] 11.1 Implement Demo page
    - Fetch and display demo products
    - Show product cards with all fields
    - Display explanatory text
    - _Requirements: 6.1, 6.2, 6.3, 6.4_



- [x] 12. Error Handling and Polish

  - [x] 12.1 Implement error handling throughout
    - Add form validation error displays
    - Add API error handling with user-friendly messages
    - Add network error handling
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 12.2 Write property test for touch target accessibility
    - **Property 14: Touch Target Accessibility**
    - **Validates: Requirements 9.1**

- [x] 13. Database Cascade and Cleanup


  - [x] 13.1 Verify cascade deletion behavior

    - Test user deletion cascades to products
    - _Requirements: 8.3_

  - [x] 13.2 Write property test for user cascade deletion
    - **Property 15: User Cascade Deletion**
    - **Validates: Requirements 8.3**

- [x] 14. Final Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.
