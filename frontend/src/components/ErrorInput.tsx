interface ErrorInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ErrorInput = ({ value, onChange, disabled = false }: ErrorInputProps) => {
  return (
    <div className="error-input">
      <label htmlFor="error-textarea">Paste Payment Error:</label>
      <textarea
        id="error-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={6}
        placeholder="Paste your payment error message here..."
      />
    </div>
  );
};
