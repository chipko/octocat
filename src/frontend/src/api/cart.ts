import axios from 'axios';
import { api } from './config';

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

const cartsUrl = `${api.baseURL}${api.endpoints.carts}`;

export const createCart = async (): Promise<Cart> => {
  const { data } = await axios.post<Cart>(cartsUrl);
  return data;
};

export const fetchCart = async (cartId: number): Promise<Cart> => {
  const { data } = await axios.get<Cart>(`${cartsUrl}/${cartId}`);
  return data;
};

export const addCartItem = async (
  cartId: number,
  productId: number,
  quantity: number,
): Promise<Cart> => {
  const { data } = await axios.post<Cart>(`${cartsUrl}/${cartId}/items`, { productId, quantity });
  return data;
};

export const updateCartItem = async (
  cartId: number,
  productId: number,
  quantity: number,
): Promise<Cart> => {
  const { data } = await axios.put<Cart>(`${cartsUrl}/${cartId}/items/${productId}`, { quantity });
  return data;
};

export const removeCartItem = async (cartId: number, productId: number): Promise<Cart> => {
  const { data } = await axios.delete<Cart>(`${cartsUrl}/${cartId}/items/${productId}`);
  return data;
};

export interface PaymentDetails {
  cardholderName: string;
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}

export interface CheckoutResult {
  order: {
    orderId: number;
    branchId: number;
    orderDate: string;
    status: string;
  };
  orderDetails: { productId: number; quantity: number; unitPrice: number }[];
  total: number;
  currency: string;
  payment: { provider: string; reference: string; last4: string };
}

export interface CheckoutRequest {
  branchId: number;
  /** The total shown to the customer; the API refuses to charge if the cart no longer matches */
  expectedTotal: number;
  payment: PaymentDetails;
}

export const checkoutCart = async (
  cartId: number,
  request: CheckoutRequest,
): Promise<CheckoutResult> => {
  const { data } = await axios.post<CheckoutResult>(`${cartsUrl}/${cartId}/checkout`, request);
  return data;
};

export const isNotFoundError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;

export const isConflictError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 409;

/**
 * Extract the API's error message ({ error: { message } }) for display, with a fallback
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: unknown } } | undefined)?.error
      ?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return fallback;
};
