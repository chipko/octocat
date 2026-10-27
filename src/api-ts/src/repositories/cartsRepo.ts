/**
 * Repository for shopping carts data access
 */

import { getDatabase, DatabaseConnection } from '../db/sqlite';
import { Cart, CartItem } from '../models/cart';
import { handleDatabaseError, NotFoundError } from '../utils/errors';

interface CartItemRow {
  product_id: number;
  name: string;
  img_name: string;
  price: number;
  discount: number | null;
  quantity: number;
}

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

/**
 * Build a cart with server-side pricing so every client sees the same totals
 */
function buildCart(cartId: number, rows: CartItemRow[]): Cart {
  const items: CartItem[] = rows.map((row) => {
    const discount = row.discount ?? 0;
    const unitPrice = roundCurrency(row.price * (1 - discount));
    return {
      productId: row.product_id,
      name: row.name,
      imgName: row.img_name,
      price: row.price,
      discount,
      unitPrice,
      quantity: row.quantity,
      lineTotal: roundCurrency(unitPrice * row.quantity),
    };
  });

  const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const total = roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0));

  return {
    cartId,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    discountTotal: roundCurrency(subtotal - total),
    total,
  };
}

export class CartsRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new empty cart
   */
  async create(): Promise<Cart> {
    try {
      const result = await this.db.run('INSERT INTO carts DEFAULT VALUES');
      return buildCart(result.lastID || 0, []);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Get cart by ID, including its items and totals
   */
  async findById(cartId: number): Promise<Cart | null> {
    try {
      const cart = await this.db.get<{ cart_id: number }>(
        'SELECT cart_id FROM carts WHERE cart_id = ?',
        [cartId],
      );
      if (!cart) {
        return null;
      }

      const rows = await this.db.all<CartItemRow>(
        `SELECT ci.product_id, p.name, p.img_name, p.price, p.discount, ci.quantity
         FROM cart_items ci
         INNER JOIN products p ON p.product_id = ci.product_id
         WHERE ci.cart_id = ?
         ORDER BY ci.cart_item_id`,
        [cartId],
      );
      return buildCart(cartId, rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Add a product to the cart, increasing the quantity if it is already there
   */
  async addItem(cartId: number, productId: number, quantity: number): Promise<Cart> {
    try {
      await this.ensureCartExists(cartId);
      const product = await this.db.get<{ product_id: number }>(
        'SELECT product_id FROM products WHERE product_id = ?',
        [productId],
      );
      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      await this.db.run(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
        [cartId, productId, quantity],
      );
      return this.touchAndGet(cartId);
    } catch (error) {
      handleDatabaseError(error, 'Cart', cartId);
    }
  }

  /**
   * Set the quantity of a product already in the cart
   */
  async updateItemQuantity(cartId: number, productId: number, quantity: number): Promise<Cart> {
    try {
      await this.ensureCartExists(cartId);
      const result = await this.db.run(
        'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?',
        [quantity, cartId, productId],
      );
      if (result.changes === 0) {
        throw new NotFoundError('Cart item for product', productId);
      }
      return this.touchAndGet(cartId);
    } catch (error) {
      handleDatabaseError(error, 'Cart', cartId);
    }
  }

  /**
   * Remove a product from the cart
   */
  async removeItem(cartId: number, productId: number): Promise<Cart> {
    try {
      await this.ensureCartExists(cartId);
      const result = await this.db.run(
        'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?',
        [cartId, productId],
      );
      if (result.changes === 0) {
        throw new NotFoundError('Cart item for product', productId);
      }
      return this.touchAndGet(cartId);
    } catch (error) {
      handleDatabaseError(error, 'Cart', cartId);
    }
  }

  private async ensureCartExists(cartId: number): Promise<void> {
    const cart = await this.db.get<{ cart_id: number }>(
      'SELECT cart_id FROM carts WHERE cart_id = ?',
      [cartId],
    );
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
  }

  private async touchAndGet(cartId: number): Promise<Cart> {
    await this.db.run('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = ?', [cartId]);
    const cart = await this.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
    return cart;
  }
}

// Factory function to create repository instance
export async function createCartsRepository(isTest: boolean = false): Promise<CartsRepository> {
  const db = await getDatabase(isTest);
  return new CartsRepository(db);
}

// Singleton instance for default usage
let cartsRepo: CartsRepository | null = null;

export async function getCartsRepository(isTest: boolean = false): Promise<CartsRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestEnv) {
    // In tests, always return a fresh repository bound to the current in-memory DB
    return createCartsRepository(true);
  }
  if (!cartsRepo) {
    cartsRepo = await createCartsRepository(false);
  }
  return cartsRepo;
}
