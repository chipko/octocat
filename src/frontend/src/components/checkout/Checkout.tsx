import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckoutResult, PaymentDetails, getApiErrorMessage, isNotFoundError } from '../../api/cart';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/currency';
import CartSummary from '../cart/CartSummary';
import CheckoutForm from './CheckoutForm';
import OrderConfirmation from './OrderConfirmation';

export default function Checkout() {
  const { cart, isLoading, error: cartError, checkout } = useCart();
  const { darkMode } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [cartGone, setCartGone] = useState(false);

  const handleSubmit = async (branchId: number, payment: PaymentDetails) => {
    if (!cart) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setResult(await checkout({ branchId, expectedTotal: cart.total, payment }));
    } catch (err) {
      if (isNotFoundError(err)) {
        // Most likely an earlier attempt succeeded but its response was lost
        setCartGone(true);
      } else {
        // Declines and validation errors leave the cart untouched, so the customer can fix and retry
        setError(getApiErrorMessage(err, 'Payment failed. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (result) {
      return <OrderConfirmation result={result} />;
    }
    if (cartGone) {
      return (
        <p className={darkMode ? 'text-light' : 'text-gray-800'} role="alert">
          This cart has already been checked out. If you were charged, your order has been placed;
          please don't pay again.{' '}
          <Link to="/products" className="text-primary hover:underline">
            Continue shopping
          </Link>
        </p>
      );
    }
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
    if (cartError && !isNotFoundError(cartError)) {
      return <div className="text-red-500 text-center">Failed to load your cart</div>;
    }
    if (!cart || cart.items.length === 0) {
      return (
        <p className={darkMode ? 'text-light' : 'text-gray-800'} role="status">
          Your cart is empty.{' '}
          <Link to="/products" className="text-primary hover:underline">
            Browse products
          </Link>
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section
          className={`lg:col-span-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 transition-colors duration-300`}
        >
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            Payment
          </h2>
          {error && (
            <div
              className="bg-red-500/10 border border-red-500 text-red-500 rounded-md p-3 mb-4"
              role="alert"
            >
              {error}
            </div>
          )}
          <CheckoutForm
            submitting={submitting}
            submitLabel={`Pay ${formatCurrency(cart.total)}`}
            onSubmit={handleSubmit}
          />
        </section>
        <CartSummary cart={cart}>
          <Link to="/cart" className="mt-6 block text-center text-primary hover:underline">
            Back to cart
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
          Checkout
        </h1>
        {renderBody()}
      </div>
    </div>
  );
}
