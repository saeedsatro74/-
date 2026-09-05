import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { parseNumberInput, formatNumberEn, numberToTomanWords } from '../utils/formatters';

interface NumericInputProps {
  id?: string;
  value: number | string;
  onChange: (val: number) => void;
  placeholder?: string;
  unitLabel?: string;
  showWordHelper?: boolean;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '0',
  unitLabel,
  showWordHelper = false,
  allowDecimals = false,
  min,
  max,
  className = '',
  disabled = false,
  required = false,
  autoFocus = false,
}) => {
  // Keep an internal string state so typing isn't jumped or reset
  const [displayValue, setDisplayValue] = useState<string>('');

  // Sync internal display when external numeric value changes from outside (e.g. initial load or reset)
  useEffect(() => {
    const num = typeof value === 'number' ? value : parseNumberInput(value);
    if (!num && num !== 0) {
      setDisplayValue('');
    } else if (num === 0 && !displayValue) {
      setDisplayValue('');
    } else {
      // Check if current display matches num
      const currentParsed = parseNumberInput(displayValue);
      if (currentParsed !== num) {
        setDisplayValue(num === 0 ? '' : allowDecimals ? num.toString() : formatNumberEn(num));
      }
    }
  }, [value, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // If empty
    if (!raw.trim()) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Convert Persian/Arabic digits and check
    const num = parseNumberInput(raw);
    
    if (min !== undefined && num < min) {
      // allowed during typing, but clamp or notify if needed
    }
    if (max !== undefined && num > max) {
      // do not allow exceeding explicit max if set
      return;
    }

    // Format with commas if integer money, or keep decimals if decimal
    if (allowDecimals) {
      // For decimal numbers, sanitize characters: digits and single dot
      const sanitized = raw
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
        .replace(/٫/g, '.')
        .replace(/[^0-9.]/g, '');
      
      // Prevent multiple dots
      const parts = sanitized.split('.');
      const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
      setDisplayValue(formatted);
      onChange(num);
    } else {
      // Integer money input: format with commas in real time
      const integerPart = Math.floor(num);
      setDisplayValue(formatNumberEn(integerPart));
      onChange(integerPart);
    }
  };

  const parsedNum = parseNumberInput(displayValue);
  const wordsHelper = showWordHelper && parsedNum > 0 ? numberToTomanWords(parsedNum) : '';

  return (
    <div className="w-full">
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode={allowDecimals ? 'decimal' : 'numeric'}
          value={displayValue}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          dir="ltr"
          className={`w-full text-left font-mono px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition-all ${
            unitLabel ? 'pl-16' : ''
          } ${!disabled && displayValue ? 'pr-8' : ''} ${className}`}
        />
        {!disabled && displayValue && (
          <button
            type="button"
            onClick={() => {
              setDisplayValue('');
              onChange(0);
            }}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer transition-colors"
            title="پاک کردن عدد"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {unitLabel && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400 pointer-events-none select-none">
            {unitLabel}
          </span>
        )}
      </div>

      {wordsHelper && (
        <div className="text-[11px] text-amber-800 font-medium mt-1 pr-1 bg-amber-50/70 py-0.5 px-1.5 rounded border border-amber-200/50 inline-block">
          {wordsHelper}
        </div>
      )}
    </div>
  );
};
