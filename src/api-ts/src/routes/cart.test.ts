import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cartRouter from './cart';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

async function createCart(): Promise<number> {
  const response = await request(app).post('/carts');
  return response.body.cartId;
}

describe('Cart API', () => {
  beforeEach(async () => {
    // Ensure a fresh in-memory database for each test
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed a supplier and two products: one discounted, one at list price
    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier One']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'SmartFeeder One', 129.99, 'CAT-FEED-001', 'piece', 'feeder.png', 0.25],
    );
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 1, 'CatFlix Portal', 89.99, 'CAT-ENT-003', 'piece', 'catflix.png', 0],
    );

    app = express();
    app.use(express.json());
    app.use('/carts', cartRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should create an empty cart', async () => {
    const response = await request(app).post('/carts');
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      cartId: expect.any(Number),
      items: [],
      itemCount: 0,
      subtotal: 0,
      discountTotal: 0,
      total: 0,
    });
  });

  it('should add items and compute discounted totals', async () => {
    const cartId = await createCart();
    await request(app).post(`/carts/${cartId}/items`).send({ productId: 1, quantity: 2 });
    const response = await request(app)
      .post(`/carts/${cartId}/items`)
      .send({ productId: 2, quantity: 1 });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({
      productId: 1,
      name: 'SmartFeeder One',
      unitPrice: 97.49,
      quantity: 2,
      lineTotal: 194.98,
    });
    expect(response.body.itemCount).toBe(3);
    expect(response.body.subtotal).toBe(349.97);
    expect(response.body.total).toBe(284.97);
    expect(response.body.discountTotal).toBe(65);
  });

  it('should increment quantity when adding a product already in the cart', async () => {
    const cartId = await createCart();
    await request(app).post(`/carts/${cartId}/items`).send({ productId: 2, quantity: 1 });
    const response = await request(app)
      .post(`/carts/${cartId}/items`)
      .send({ productId: 2, quantity: 2 });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3);
  });

  it('should persist the cart between requests', async () => {
    const cartId = await createCart();
    await request(app).post(`/carts/${cartId}/items`).send({ productId: 2, quantity: 4 });

    const response = await request(app).get(`/carts/${cartId}`);
    expect(response.status).toBe(200);
    expect(response.body.items[0].quantity).toBe(4);
    expect(response.body.total).toBe(359.96);
  });

  it('should update the quantity of an item', async () => {
    const cartId = await createCart();
    await request(app).post(`/carts/${cartId}/items`).send({ productId: 2, quantity: 1 });

    const response = await request(app).put(`/carts/${cartId}/items/2`).send({ quantity: 5 });
    expect(response.status).toBe(200);
    expect(response.body.items[0].quantity).toBe(5);
    expect(response.body.total).toBe(449.95);
  });

  it('should remove an item', async () => {
    const cartId = await createCart();
    await request(app).post(`/carts/${cartId}/items`).send({ productId: 1, quantity: 1 });
    await request(app).post(`/carts/${cartId}/items`).send({ productId: 2, quantity: 1 });

    const response = await request(app).delete(`/carts/${cartId}/items/1`);
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { productId: number }) => item.productId)).toEqual([2]);
  });

  it('should return 404 for a non-existing cart', async () => {
    const response = await request(app).get('/carts/999');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 when adding a non-existing product', async () => {
    const cartId = await createCart();
    const response = await request(app)
      .post(`/carts/${cartId}/items`)
      .send({ productId: 999, quantity: 1 });
    expect(response.status).toBe(404);
  });

  it('should return 404 when updating a product that is not in the cart', async () => {
    const cartId = await createCart();
    const response = await request(app).put(`/carts/${cartId}/items/1`).send({ quantity: 1 });
    expect(response.status).toBe(404);
  });

  it.each([0, -1, 1.5, 'two', null])('should reject invalid quantity %s', async (quantity) => {
    const cartId = await createCart();
    const response = await request(app)
      .post(`/carts/${cartId}/items`)
      .send({ productId: 1, quantity });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject a non-numeric cart ID', async () => {
    const response = await request(app).get('/carts/abc');
    expect(response.status).toBe(400);
  });
});
