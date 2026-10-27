import { FormEvent, useState } from 'react';
import { useQuery } from 'react-query';
import { fetchBranches } from '../../api/branches';
import { PaymentDetails } from '../../api/cart';
import { useTheme } from '../../context/ThemeContext';
import { parseExpiry } from '../../utils/cardExpiry';

interface CheckoutFormProps {
  submitting: boolean;
  submitLabel: string;
  onSubmit: (branchId: number, payment: PaymentDetails) => void;
}

export default function CheckoutForm({ submitting, submitLabel, onSubmit }: CheckoutFormProps) {
  const { darkMode } = useTheme();
  const { data: branches, isLoading: branchesLoading } = useQuery('branches', fetchBranches);
  const [branchId, setBranchId] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [expiryError, setExpiryError] = useState<string | null>(null);

  const labelClass = `block ${darkMode ? 'text-light' : 'text-gray-700'} mb-2 transition-colors duration-300`;
  const inputClass = `w-full ${darkMode ? 'bg-gray-700 text-light' : 'bg-gray-100 text-gray-800'} rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300`;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedExpiry = parseExpiry(expiry);
    if (!parsedExpiry) {
      setExpiryError('Enter the expiry date as MM/YY');
      return;
    }
    setExpiryError(null);
    onSubmit(Number(branchId), { cardholderName, cardNumber, cvc, ...parsedExpiry });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Payment details">
      <div>
        <label htmlFor="checkout-branch" className={labelClass}>
          Ordering branch
        </label>
        <select
          id="checkout-branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className={inputClass}
          required
          disabled={branchesLoading}
        >
          <option value="">{branchesLoading ? 'Loading branches…' : 'Select a branch'}</option>
          {branches?.map((branch) => (
            <option key={branch.branchId} value={branch.branchId}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="checkout-name" className={labelClass}>
          Name on card
        </label>
        <input
          id="checkout-name"
          autoComplete="cc-name"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <div>
        <label htmlFor="checkout-card-number" className={labelClass}>
          Card number
        </label>
        <input
          id="checkout-card-number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="checkout-expiry" className={labelClass}>
            Expiry (MM/YY)
          </label>
          <input
            id="checkout-expiry"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className={inputClass}
            aria-invalid={expiryError !== null}
            aria-describedby={expiryError ? 'checkout-expiry-error' : undefined}
            required
          />
          {expiryError && (
            <p id="checkout-expiry-error" className="text-red-500 text-sm mt-1">
              {expiryError}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="checkout-cvc" className={labelClass}>
            CVC
          </label>
          <input
            id="checkout-cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary hover:bg-accent text-white py-2 px-4 rounded-lg disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {submitting ? 'Processing payment…' : submitLabel}
      </button>
    </form>
  );
}
