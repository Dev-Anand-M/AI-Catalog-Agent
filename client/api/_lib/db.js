// Database connection for Vercel
// Uses Vercel Postgres or falls back to in-memory for demo

let users = [];
let products = [];
let nextUserId = 1;
let nextProductId = 1;

// In-memory database for demo/prototype
// For production, replace with Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres

export const db = {
  // Users
  findUserByEmail: (email) => users.find(u => u.email === email),
  findUserById: (id) => users.find(u => u.id === id),
  createUser: (data) => {
    const user = { id: nextUserId++, ...data, createdAt: new Date() };
    users.push(user);
    return user;
  },

  // Products
  findProductsByUserId: (userId) => products.filter(p => p.userId === userId).sort((a, b) => b.createdAt - a.createdAt),
  findProductById: (id, userId) => products.find(p => p.id === id && p.userId === userId),
  findProductByIdPublic: (id) => products.find(p => p.id === id),
  findProductsByUserIdPublic: (userId) => products.filter(p => p.userId === userId),
  createProduct: (data) => {
    const product = { id: nextProductId++, ...data, createdAt: new Date() };
    products.push(product);
    return product;
  },
  updateProduct: (id, userId, data) => {
    const index = products.findIndex(p => p.id === id && p.userId === userId);
    if (index === -1) return null;
    products[index] = { ...products[index], ...data };
    return products[index];
  },
  deleteProduct: (id, userId) => {
    const index = products.findIndex(p => p.id === id && p.userId === userId);
    if (index === -1) return false;
    products.splice(index, 1);
    return true;
  }
};

export default db;
