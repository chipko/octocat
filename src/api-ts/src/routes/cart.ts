/**
 * @swagger
 * tags:
 *   name: Carts
 *   description: API endpoints for managing shopping carts
 */

/**
 * @swagger
 * /api/carts:
 *   post:
 *     summary: Create a new empty cart
 *     tags: [Carts]
 *     responses:
 *       201:
 *         description: Cart created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *
 * /api/carts/{id}:
 *   get:
 *     summary: Get a cart with its items and totals
 *     tags: [Carts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart ID
 *     responses:
 *       200:
 *         description: Cart found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart not found
 *
 * /api/carts/{id}/items:
 *   post:
 *     summary: Add a product to the cart (increments quantity if already present)
 *     tags: [Carts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemInput'
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Invalid product ID or quantity
 *       404:
 *         description: Cart or product not found
 *
 * /api/carts/{id}/items/{productId}:
 *   put:
 *     summary: Set the quantity of a product in the cart
 *     tags: [Carts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemInput'
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Invalid quantity
 *       404:
 *         description: Cart or cart item not found
 *   delete:
 *     summary: Remove a product from the cart
 *     tags: [Carts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart or cart item not found
 */

import express from 'express';
import { getCartsRepository } from '../repositories/cartsRepo';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = express.Router();

function parsePositiveInt(value: unknown, field: string): number {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ValidationError(`${field} must be a positive integer`);
  }
  return parsed;
}

// Create a new cart
router.post('/', async (req, res, next) => {
  try {
    const repo = await getCartsRepository();
    const cart = await repo.create();
    res.status(201).json(cart);
  } catch (error) {
    next(error);
  }
});

// Get a cart by ID
router.get('/:id', async (req, res, next) => {
  try {
    const cartId = parsePositiveInt(req.params.id, 'cartId');
    const repo = await getCartsRepository();
    const cart = await repo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

// Add a product to a cart
router.post('/:id/items', async (req, res, next) => {
  try {
    const cartId = parsePositiveInt(req.params.id, 'cartId');
    const productId = parsePositiveInt(req.body?.productId, 'productId');
    const quantity = parsePositiveInt(req.body?.quantity, 'quantity');
    const repo = await getCartsRepository();
    res.json(await repo.addItem(cartId, productId, quantity));
  } catch (error) {
    next(error);
  }
});

// Set the quantity of a product in a cart
router.put('/:id/items/:productId', async (req, res, next) => {
  try {
    const cartId = parsePositiveInt(req.params.id, 'cartId');
    const productId = parsePositiveInt(req.params.productId, 'productId');
    const quantity = parsePositiveInt(req.body?.quantity, 'quantity');
    const repo = await getCartsRepository();
    res.json(await repo.updateItemQuantity(cartId, productId, quantity));
  } catch (error) {
    next(error);
  }
});

// Remove a product from a cart
router.delete('/:id/items/:productId', async (req, res, next) => {
  try {
    const cartId = parsePositiveInt(req.params.id, 'cartId');
    const productId = parsePositiveInt(req.params.productId, 'productId');
    const repo = await getCartsRepository();
    res.json(await repo.removeItem(cartId, productId));
  } catch (error) {
    next(error);
  }
});

export default router;
