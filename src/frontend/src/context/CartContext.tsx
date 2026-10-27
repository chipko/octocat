import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Cart,
  addCartItem,
  createCart,
  fetchCart,
  isNotFoundError,
  removeCartItem,
  updateCartItem,
} from '../api/cart';

// The cart itself lives in the API; the browser only remembers which cart is ours.
const CART_ID_STORAGE_KEY = 'octocat-cart-id';

function readStoredCartId(): number | null {
  try {
    const stored = Number(localStorage.getItem(CART_ID_STORAGE_KEY));
    return Number.isInteger(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

function storeCartId(cartId: number | null): void {
  try {
    if (cartId === null) {
      localStorage.removeItem(CART_ID_STORAGE_KEY);
    } else {
      localStorage.setItem(CART_ID_STORAGE_KEY, String(cartId));
    }
  } catch {
    // Storage unavailable (e.g. private mode): the cart still works for this page session
  }
}

interface CartContextType {
  cart: Cart | undefined;
  itemCount: number;
  isLoading: boolean;
  isUpdating: boolean;
  error: unknown;
  addItem: (productId: number, quantity: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [cartId, setCartId] = useState<number | null>(readStoredCartId);
  const pendingCartId = useRef<Promise<number> | null>(null);

  const cartQuery = useQuery(['cart', cartId], () => fetchCart(cartId!), {
    enabled: cartId !== null,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 3,
  });

  // A stored cart can disappear (e.g. the database was reset): start a fresh one on next add
  useEffect(() => {
    if (isNotFoundError(cartQuery.error)) {
      storeCartId(null);
      setCartId(null);
    }
  }, [cartQuery.error]);

  // Carts are created lazily on first add; share one in-flight creation between callers
  const ensureCartId = useCallback(async (): Promise<number> => {
    if (cartId !== null) {
      return cartId;
    }
    if (!pendingCartId.current) {
      pendingCartId.current = createCart()
        .then((cart) => {
          storeCartId(cart.cartId);
          setCartId(cart.cartId);
          queryClient.setQueryData(['cart', cart.cartId], cart);
          return cart.cartId;
        })
        .finally(() => {
          pendingCartId.current = null;
        });
    }
    return pendingCartId.current;
  }, [cartId, queryClient]);

  const onCartChanged = (cart: Cart) => {
    queryClient.setQueryData(['cart', cart.cartId], cart);
  };

  const addMutation = useMutation(
    async ({ productId, quantity }: { productId: number; quantity: number }) =>
      addCartItem(await ensureCartId(), productId, quantity),
    { onSuccess: onCartChanged },
  );
  const updateMutation = useMutation(
    ({ productId, quantity }: { productId: number; quantity: number }) =>
      updateCartItem(cartId!, productId, quantity),
    { onSuccess: onCartChanged },
  );
  const removeMutation = useMutation((productId: number) => removeCartItem(cartId!, productId), {
    onSuccess: onCartChanged,
  });

  const value: CartContextType = {
    cart: cartQuery.data,
    itemCount: cartQuery.data?.itemCount ?? 0,
    isLoading: cartQuery.isLoading,
    isUpdating: addMutation.isLoading || updateMutation.isLoading || removeMutation.isLoading,
    error: cartQuery.error,
    addItem: async (productId, quantity) => {
      await addMutation.mutateAsync({ productId, quantity });
    },
    updateQuantity: async (productId, quantity) => {
      await updateMutation.mutateAsync({ productId, quantity });
    },
    removeItem: async (productId) => {
      await removeMutation.mutateAsync(productId);
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
