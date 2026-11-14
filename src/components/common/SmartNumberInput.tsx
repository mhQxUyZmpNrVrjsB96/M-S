import React, { useState, useEffect, useRef } from 'react';
import { parseEuro } from '../../utils/vendingUtils';

export interface SmartNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | '';
  onChange?: (val: any) => void;
  onNumberChange?: (val: any) => void;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
  defaultValueIfEmpty?: number | '';
  allowEmpty?: boolean;
}

export const SmartNumberInput: React.FC<SmartNumberInputProps> = ({
  value,
  onChange,
  onNumberChange,
  allowDecimals = false,
  min,
  max,
  defaultValueIfEmpty = 0,
  allowEmpty = false,
  className = '',
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}) => {
  const isFocusedRef = useRef(false);
  const isDirtyRef = useRef(false);

  // Supporta sia onChange che onNumberChange
  const notifyChange = (val: number | '') => {
    if (onNumberChange) onNumberChange(val);
    if (onChange) onChange(val);
  };

  // Mantieni il testo locale per permettere all'utente di cancellare e digitare senza riscritture
  const [localText, setLocalText] = useState<string>(() => {
    if (value === '' || (value === 0 && allowEmpty)) return '';
    return String(value);
  });

  // Sincronizza lo stato locale quando il valore cambia esternamente (solo quando il campo non è attivo)
  useEffect(() => {
    if (isFocusedRef.current) return;
    if (value === '' || (value === 0 && allowEmpty)) {
      setLocalText('');
      isDirtyRef.current = false;
      return;
    }
    setLocalText(String(value));
    isDirtyRef.current = false;
  }, [value, allowDecimals, allowEmpty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDirtyRef.current = true;
    setLocalText(e.target.value);
  };

  const clampValue = (num: number): number => {
    let constrained = allowDecimals ? num : Math.round(num);
    if (min !== undefined && constrained < min) constrained = min;
    if (max !== undefined && constrained > max) constrained = max;
    return constrained;
  };

  const commitValue = () => {
    const trimmed = localText.trim();
    if (trimmed === '') {
      isDirtyRef.current = false;
      if (allowEmpty) {
        setLocalText('');
        notifyChange('');
      } else {
        const fallback = typeof defaultValueIfEmpty === 'number' ? clampValue(defaultValueIfEmpty) : 0;
        setLocalText(String(fallback));
        notifyChange(fallback);
      }
      return;
    }

    let parsed: number;
    if (!isDirtyRef.current && typeof value === 'number' && !isNaN(value)) {
      parsed = value;
    } else if (allowDecimals) {
      parsed = parseEuro(trimmed);
    } else {
      const normalizedInt = trimmed.replace(/[.\s]/g, '');
      parsed = /^-?\d+$/.test(normalizedInt)
        ? parseInt(normalizedInt, 10)
        : Math.trunc(parseEuro(trimmed));
    }

    isDirtyRef.current = false;

    if (isNaN(parsed)) {
      if (allowEmpty) {
        setLocalText('');
        notifyChange('');
      } else {
        const fallback = typeof defaultValueIfEmpty === 'number'
          ? clampValue(defaultValueIfEmpty)
          : (typeof value === 'number' && !isNaN(value) ? clampValue(value) : 0);
        setLocalText(String(fallback));
        notifyChange(fallback);
      }
      return;
    }

    const constrained = clampValue(parsed);
    setLocalText(String(constrained));
    notifyChange(constrained);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    // Al tocco su tablet o click del mouse, seleziona tutto il testo per sovrascrivere istantaneamente
    e.target.select();
    try {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch {
      // no-op
    }
    if (onFocus) onFocus(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (localText === '0' || localText === '0.00' || localText === '') {
      e.currentTarget.select();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    commitValue();
    if (onBlur) onBlur(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.currentTarget.form) {
        e.preventDefault();
      }
      commitValue();
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      value={localText}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    />
  );
};
