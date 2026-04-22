import { useState } from 'react';
import './ErrorInput.css'

interface ErrorInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

function detectPSP(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('stripe') || t.includes('ch_') || t.includes('pi_') || t.includes('pm_')) return 'Stripe';
  if (t.includes('checkout') || t.includes('cko_') || t.includes('pay_')) return 'Checkout.com';
  if (t.includes('paypal') || t.includes('braintree')) return 'PayPal';
  if (t.includes('adyen')) return 'Adyen';
  if (t.includes('square')) return 'Square';
  return null;
}

const PSP_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Stripe:         { bg: 'rgba(99,91,255,0.12)',  color: '#a5a0ff', border: 'rgba(99,91,255,0.25)' },
  'Checkout.com': { bg: 'rgba(52,211,153,0.1)',  color: '#34d399', border: 'rgba(52,211,153,0.25)' },
  PayPal:         { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  Adyen:          { bg: 'rgba(96,165,250,0.1)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  Square:         { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.25)' },
};

export const ErrorInput = ({ value, onChange, disabled = false, onSubmit }: ErrorInputProps) => {
  const [focused, setFocused] = useState(false);
  const psp = detectPSP(value);
  const lineCount = Math.max(6, value.split('\n').length + 1);

  return (
    <div className="error-input">
      <div className="error-input__header">
        <label htmlFor="error-textarea" className="error-input__label">
          Payment Error
        </label>
        {psp && (
          <span
            className="psp-badge"
            style={{
              background: PSP_COLORS[psp]?.bg,
              color: PSP_COLORS[psp]?.color,
              border: `1px solid ${PSP_COLORS[psp]?.border}`,
            }}
          >
            {psp}
          </span>
        )}
      </div>

      <div className={`error-input__box${focused ? ' focused' : ''}`}>
        {/* Line numbers */}
        <div className="error-input__gutter" aria-hidden>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="error-input__line-num">{i + 1}</div>
          ))}
        </div>

        <textarea
          id="error-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit?.();
          }}
          rows={6}
          placeholder={
            'Paste an error code or full error message…\n\nExamples:\n  card_declined\n  {"error": {"code": "insufficient_funds"}}\n  Your card was declined. Please try another card.'
          }
          className="error-input__textarea"
        />
      </div>

      <div className="error-input__footer">
        <span className="error-input__char-count">
          {value.length > 0 ? `${value.length} chars` : ''}
        </span>
        <span className="error-input__hint">⌘ + Enter to analyze</span>
      </div>
    </div>
  );
};
