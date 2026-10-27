import { Link } from 'react-router-dom';
import { CheckoutResult } from '../../api/cart';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/currency';

export default function OrderConfirmation({ result }: { result: CheckoutResult }) {
  const { darkMode } = useTheme();

  return (
    <section
      className={`max-w-xl mx-auto text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8 transition-colors duration-300`}
      role="status"
      aria-live="polite"
    >
      <h2 className="text-2xl font-bold text-primary mb-2">Thank you, your order has been placed!</h2>
      <p className={darkMode ? 'text-light' : 'text-gray-800'}>
        Order <span className="font-semibold">#{result.order.orderId}</span> ·{' '}
        <span data-testid="order-total">{formatCurrency(result.total)}</span> paid with the card
        ending {result.payment.last4}.
      </p>
      <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Payment reference: {result.payment.reference}
      </p>
      <Link
        to="/products"
        className="inline-block mt-6 bg-primary hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors"
      >
        Continue shopping
      </Link>
    </section>
  );
}
