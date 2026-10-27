/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: integer
 *           description: The ID of the product in the cart
 *         name:
 *           type: string
 *           description: The name of the product
 *         imgName:
 *           type: string
 *           description: Filename of the product image
 *         price:
 *           type: number
 *           format: float
 *           description: The list price of the product
 *         discount:
 *           type: number
 *           format: float
 *           description: Discount expressed as a decimal (e.g., 0.25 for 25%)
 *         unitPrice:
 *           type: number
 *           format: float
 *           description: The price per unit after discount
 *         quantity:
 *           type: integer
 *           description: Number of units in the cart
 *         lineTotal:
 *           type: number
 *           format: float
 *           description: unitPrice multiplied by quantity
 *     Cart:
 *       type: object
 *       properties:
 *         cartId:
 *           type: integer
 *           description: The unique identifier for the cart
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         itemCount:
 *           type: integer
 *           description: Total number of units across all items
 *         subtotal:
 *           type: number
 *           format: float
 *           description: Sum of list prices before discounts
 *         discountTotal:
 *           type: number
 *           format: float
 *           description: Total amount saved through product discounts
 *         total:
 *           type: number
 *           format: float
 *           description: Amount payable (subtotal minus discountTotal)
 *     CartItemInput:
 *       type: object
 *       required:
 *         - quantity
 *       properties:
 *         productId:
 *           type: integer
 *           description: The ID of the product (required when adding an item)
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Number of units
 */
export interface CartItem {
  productId: number;
  name: string;
  imgName: string;
  price: number;
  discount: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  cartId: number;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  total: number;
}
