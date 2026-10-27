import { CartItem } from '../../api/cart';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/currency';

interface CartItemRowProps {
  item: CartItem;
  disabled: boolean;
  onQuantityChange: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

export default function CartItemRow({ item, disabled, onQuantityChange, onRemove }: CartItemRowProps) {
  const { darkMode } = useTheme();
  const hasDiscount = item.discount > 0;
  const stepButtonClass = `w-8 h-8 flex items-center justify-center ${darkMode ? 'text-light' : 'text-gray-700'} hover:text-primary disabled:opacity-40 disabled:hover:text-inherit transition-colors duration-300`;

  return (
    <li
      className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b last:border-b-0`}
      data-testid={`cart-item-${item.productId}`}
    >
      <div className="flex items-center gap-4 flex-grow min-w-0">
        <img
          src={`/${item.imgName}`}
          alt={item.name}
          width={80}
          height={80}
          className={`w-20 h-20 object-contain rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
        />
        <div className="min-w-0">
          <h2 className={`font-semibold truncate ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            {item.name}
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {hasDiscount && (
              <span className="line-through mr-2">{formatCurrency(item.price)}</span>
            )}
            <span className="text-primary font-medium">{formatCurrency(item.unitPrice)}</span> each
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6">
        <div
          className={`flex items-center space-x-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg p-1 transition-colors duration-300`}
        >
          <button
            onClick={() => onQuantityChange(item.productId, item.quantity - 1)}
            className={stepButtonClass}
            disabled={disabled || item.quantity <= 1}
            aria-label={`Decrease quantity of ${item.name}`}
          >
            <span aria-hidden="true">-</span>
          </button>
          <span
            className={`${darkMode ? 'text-light' : 'text-gray-800'} min-w-[2rem] text-center`}
            aria-label={`Quantity of ${item.name}`}
            data-testid={`cart-qty-${item.productId}`}
          >
            {item.quantity}
          </span>
          <button
            onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
            className={stepButtonClass}
            disabled={disabled}
            aria-label={`Increase quantity of ${item.name}`}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>

        <span
          className={`w-24 text-right font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}
          data-testid={`cart-line-total-${item.productId}`}
        >
          {formatCurrency(item.lineTotal)}
        </span>

        <button
          onClick={() => onRemove(item.productId)}
          disabled={disabled}
          className={`p-2 rounded-md ${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 transition-colors`}
          aria-label={`Remove ${item.name} from cart`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </li>
  );
}
