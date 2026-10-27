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
 *
 * /api/carts/{id}/checkout:
 *   post:
 *     summary: Pay for the cart and convert it into a confirmed order
 *     description: >
 *       Charges the cart total through the configured payment provider (PAYMENT_PROVIDER).
 *       On success the cart is replaced by an order (status processing) with one order detail per item.
 *       On a declined payment nothing is written and the cart is left intact. The cart is locked
 *       while the payment runs, and the charge is refunded if the order can't be recorded.
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
 *             $ref: '#/components/schemas/CheckoutInput'
 *     responses:
 *       201:
 *         description: Payment succeeded and the order was created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutResult'
 *       400:
 *         description: Invalid branch or payment details
 *       402:
 *         description: Payment declined (cart left intact)
 *       404:
 *         description: Cart or branch not found
 *       409:
 *         description: Cart is empty, its total changed, or a checkout is already in progress
 *       503:
 *         description: Payment provider is not configured
 *
 * components:
 *   schemas:
 *     CheckoutInput:
 *       type: object
 *       required:
 *         - branchId
 *         - expectedTotal
 *         - payment
 *       properties:
 *         branchId:
 *           type: integer
 *           description: The branch placing the order
 *         expectedTotal:
 *           type: number
 *           format: float
 *           description: The cart total shown to the customer; checkout fails with 409 if it no longer matches
 *         payment:
 *           type: object
 *           required: [cardholderName, cardNumber, expMonth, expYear, cvc]
 *           properties:
 *             cardholderName:
 *               type: string
 *             cardNumber:
 *               type: string
 *               example: '4242 4242 4242 4242'
 *             expMonth:
 *               type: integer
 *               example: 12
 *             expYear:
 *               type: integer
 *               example: 2030
 *             cvc:
 *               type: string
 *               example: '123'
 *     CheckoutResult:
 *       type: object
 *       properties:
 *         order:
 *           $ref: '#/components/schemas/Order'
 *         orderDetails:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderDetail'
 *         total:
 *           type: number
 *           format: float
 *         currency:
 *           type: string
 *         payment:
 *           type: object
 *           properties:
 *             provider:
 *               type: string
 *             reference:
 *               type: string
 *             last4:
 *               type: string
 */

import express from 'express';
import { getCartsRepository } from '../repositories/cartsRepo';
import { parseCardDetails } from '../payments/cardValidation';
import { createPaymentProvider, getPaymentConfig, PaymentProvider } from '../payments/paymentProvider';
import { checkoutCart } from '../services/checkoutService';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = express.Router();

// Created on first checkout so a misconfigured provider fails that request, not server start-up
let paymentProvider: PaymentProvider | null = null;

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

// Pay for a cart and convert it into an order
router.post('/:id/checkout', async (req, res, next) => {
  try {
    const cartId = parsePositiveInt(req.params.id, 'cartId');
    const branchId = parsePositiveInt(req.body?.branchId, 'branchId');
    const expectedTotal = req.body?.expectedTotal;
    if (typeof expectedTotal !== 'number' || !Number.isFinite(expectedTotal) || expectedTotal <= 0) {
      throw new ValidationError('expectedTotal must be a positive number');
    }
    const card = parseCardDetails(req.body?.payment);
    const config = getPaymentConfig();
    paymentProvider ??= createPaymentProvider(config);
    const result = await checkoutCart(
      cartId,
      { branchId, expectedTotal, card },
      paymentProvider,
      config.currency,
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
