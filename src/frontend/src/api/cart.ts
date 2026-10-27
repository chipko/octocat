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

export const isNotFoundError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;
