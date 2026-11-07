import React, { useState, useEffect } from 'react';

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
  ...props
}) => {
  // Supporta sia onChange che onNumberChange
  const notifyChange = (val: number | '') => {
    if (onNumberChange) onNumberChange(val);
    if (onChange) onChange(val);
  };
  // Mantieni il testo locale per permettere all'utente di cancellare completamente la casella senza vedere "0"
  const [localText, setLocalText] = useState<string>(() => {
    if (value === '' || (value === 0 && allowEmpty)) return '';
    return String(value);
  });

  // Sincronizza lo stato locale quando il valore cambia esternamente
  useEffect(() => {
    if (value === '') {
      setLocalText('');
      return;
    }
    const parsed = allowDecimals ? parseFloat(localText) : parseInt(localText, 10);
    if (isNaN(parsed) || parsed !== value) {
      setLocalText(value === 0 && allowEmpty ? '' : String(value));
    }
  }, [value, allowDecimals, allowEmpty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Se l'utente ha cancellato tutto o ha lasciato solo spazi vuoti
    if (raw === '' || raw.trim() === '') {
      setLocalText('');
      notifyChange(allowEmpty ? '' : defaultValueIfEmpty);
      return;
    }

    // Se l'utente digita una cifra quando la casella ha solo '0', sostituisci direttamente lo zero iniziale
    let cleaned = raw;
    if (cleaned.length > 1 && cleaned.startsWith('0') && !cleaned.startsWith('0.')) {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }

    setLocalText(cleaned);

    const parsed = allowDecimals ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      let constrained = parsed;
      if (min !== undefined && constrained < min) constrained = min;
      if (max !== undefined && constrained > max) constrained = max;
      notifyChange(constrained);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Al tocco su tablet o click del mouse, seleziona tutto il testo in modo che digitando un nuovo numero si sovrascriva istantaneamente
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
    // Su molti browser tablet/mobile, mouseup/touchend deseleziona il testo dopo focus:
    // Se era già selezionato o prima volta, manteniamo la selezione per facilitare la digitazione
    if (localText === '0' || localText === '0.00' || localText === '') {
      e.currentTarget.select();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Quando si toglie il focus, se è rimasto vuoto ripristina il valore formattato o lascia vuoto se allowEmpty
    if (localText === '' || rawIsWhitespace(localText)) {
      if (allowEmpty) {
        setLocalText('');
        notifyChange('');
      } else {
        setLocalText(String(defaultValueIfEmpty));
        notifyChange(defaultValueIfEmpty);
      }
    } else {
      const parsed = allowDecimals ? parseFloat(localText) : parseInt(localText, 10);
      if (isNaN(parsed)) {
        if (allowEmpty) {
          setLocalText('');
          notifyChange('');
        } else {
          setLocalText(String(defaultValueIfEmpty));
          notifyChange(defaultValueIfEmpty);
        }
      } else {
        setLocalText(String(parsed));
      }
    }
    if (onBlur) onBlur(e);
  };

  function rawIsWhitespace(s: string) {
    return s.trim() === '';
  }

  return (
    <input
      type="number"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      value={localText}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onBlur={handleBlur}
      min={min}
      max={max}
      className={className}
      {...props}
    />
  );
};
