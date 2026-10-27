import { ReactNode } from 'react';
import { Cart } from '../../api/cart';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/currency';

export default function CartSummary({ cart, children }: { cart: Cart; children?: ReactNode }) {
  const { darkMode } = useTheme();
  const labelClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const valueClass = darkMode ? 'text-light' : 'text-gray-800';

  return (
    <section
      aria-labelledby="order-summary-heading"
      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 h-fit transition-colors duration-300`}
    >
      <h2 id="order-summary-heading" className={`text-xl font-bold mb-4 ${valueClass}`}>
        Order Summary
      </h2>
      <dl className="space-y-3">
        <div className="flex justify-between">
          <dt className={labelClass}>Subtotal ({cart.itemCount} items)</dt>
          <dd className={valueClass} data-testid="cart-subtotal">
            {formatCurrency(cart.subtotal)}
          </dd>
        </div>
        {cart.discountTotal > 0 && (
          <div className="flex justify-between">
            <dt className={labelClass}>Discounts</dt>
            <dd className="text-primary" data-testid="cart-discount">
              -{formatCurrency(cart.discountTotal)}
            </dd>
          </div>
        )}
        <div
          className={`flex justify-between pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <dt className={`font-bold ${valueClass}`}>Total</dt>
          <dd className="font-bold text-primary text-lg" data-testid="cart-total">
            {formatCurrency(cart.total)}
          </dd>
        </div>
      </dl>
      {children}
    </section>
  );
}
