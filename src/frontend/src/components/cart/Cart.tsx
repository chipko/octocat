import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import CartItemRow from './CartItemRow';
import CartSummary from './CartSummary';

export default function Cart() {
  const { cart, isLoading, isUpdating, error, updateQuantity, removeItem } = useCart();
  const { darkMode } = useTheme();

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch {
      alert('Failed to update the cart. Please try again.');
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error && !cart) {
      return <div className="text-red-500 text-center">Failed to load your cart</div>;
    }

    if (!cart || cart.items.length === 0) {
      return (
        <div
          className={`flex flex-col items-center justify-center text-center py-20 rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border`}
          role="status"
        >
          <p className={`${darkMode ? 'text-light' : 'text-gray-800'} text-lg font-medium`}>
            Your cart is empty
          </p>
          <Link
            to="/products"
            className="mt-4 bg-primary hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors"
          >
            Browse products
          </Link>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ul
          className={`lg:col-span-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg transition-colors duration-300`}
          aria-busy={isUpdating}
        >
          {cart.items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              disabled={isUpdating}
              onQuantityChange={(productId, quantity) =>
                handleAction(() => updateQuantity(productId, quantity))
              }
              onRemove={(productId) => handleAction(() => removeItem(productId))}
            />
          ))}
        </ul>
        <CartSummary cart={cart}>
          <Link
            to="/checkout"
            className="mt-6 block w-full text-center bg-primary hover:bg-accent text-white py-2 px-4 rounded-lg transition-colors"
          >
            Proceed to checkout
          </Link>
        </CartSummary>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto flex flex-col space-y-6">
        <h1
          className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} transition-colors duration-300`}
        >
          Your Cart
        </h1>
        {renderBody()}
      </div>
    </div>
  );
}
