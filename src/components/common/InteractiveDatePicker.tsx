import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface InteractiveDatePickerProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  placeholder?: string;
  showShortcuts?: boolean;
  id?: string;
}

const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEKDAY_NAMES_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateString(year: number, monthIndex: number, day: number): string {
  return `${year}-${padZero(monthIndex + 1)}-${padZero(day)}`;
}

function parseDateString(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function getTodayString(): string {
  const d = new Date();
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDaysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

export const InteractiveDatePicker: React.FC<InteractiveDatePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  min,
  max,
  className = '',
  placeholder = 'AAAA-MM-GG',
  showShortcuts = true,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calcola mese e anno correnti per la visualizzazione del calendario
  const parsed = parseDateString(value);
  const [viewYear, setViewYear] = useState<number>(() => parsed?.year || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parsed?.month ?? new Date().getMonth());

  // Aggiorna viewYear e viewMonth se il valore cambia dall'esterno
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  // Chiudi cliccando fuori
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const formatted = formatDateString(year, month, day);
    onChange(formatted);
    setIsOpen(false);
  };

  // Genera la griglia dei giorni per il mese visualizzato
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Lunedì = 0
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];

  // Giorni del mese precedente
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({
      year: prevYear,
      month: prevMonthIdx,
      day: dayNum,
      isCurrentMonth: false,
      dateStr: formatDateString(prevYear, prevMonthIdx, dayNum)
    });
  }

  // Giorni del mese corrente
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      year: viewYear,
      month: viewMonth,
      day,
      isCurrentMonth: true,
      dateStr: formatDateString(viewYear, viewMonth, day)
    });
  }

  // Giorni del mese successivo per completare la griglia a multipli di 7 (max 42)
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      year: nextYear,
      month: nextMonthIdx,
      day,
      isCurrentMonth: false,
      dateStr: formatDateString(nextYear, nextMonthIdx, day)
    });
  }

  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();

  // Testo leggibile della data
  const readableDate = (() => {
    if (!value) return '';
    if (value === todayStr) return 'Oggi';
    if (value === yesterdayStr) return 'Ieri';
    const p = parseDateString(value);
    if (!p) return value;
    return `${p.day} ${MONTH_NAMES_IT[p.month].slice(0, 3)} ${p.year}`;
  })();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={id} className="block text-2xs sm:text-xs font-bold text-stone-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>

          {showShortcuts && (
            <div className="flex items-center space-x-1.5 text-3xs font-bold">
              <button
                type="button"
                onClick={() => onChange(todayStr)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  value === todayStr
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                }`}
                title="Imposta la data di oggi"
              >
                Oggi
              </button>
              <button
                type="button"
                onClick={() => onChange(yesterdayStr)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  value === yesterdayStr
                    ? 'bg-stone-200 text-stone-800'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
                title="Imposta a ieri"
              >
                Ieri
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input row con campo nativo sincronizzato + pulsante apri calendario */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          required={required}
          placeholder={placeholder}
          style={{ colorScheme: 'light' }}
          className="w-full pl-3 pr-20 py-1.5 sm:py-2 text-xs sm:text-sm border border-stone-300 rounded-lg text-stone-900 font-mono bg-white cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        />

        {/* Badge e pulsante calendario per apertura garantita in iframe/mobile */}
        <div className="absolute right-1 flex items-center space-x-1">
          {readableDate && (
            <span className="hidden sm:inline-block text-3xs font-semibold px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
              {readableDate}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(prev => !prev);
            }}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isOpen
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-500 hover:text-emerald-700 hover:bg-stone-100'
            }`}
            title="Apri calendario interattivo"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Popover Calendario Interattivo - 100% funzionante in qualsiasi ambiente */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header Mese/Anno con frecce */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors"
              title="Mese precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-xs font-bold text-stone-900">
                {MONTH_NAMES_IT[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors"
              title="Mese successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Intestazioni Giorni Settimana */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES_IT.map(dayName => (
              <span key={dayName} className="text-3xs font-bold text-stone-400 uppercase py-0.5">
                {dayName}
              </span>
            ))}
          </div>

          {/* Griglia Giorni */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              const isSelected = item.dateStr === value;
              const isToday = item.dateStr === todayStr;

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(item.year, item.month, item.day)}
                  className={`h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : !item.isCurrentMonth
                      ? 'text-stone-300 hover:bg-stone-50'
                      : isToday
                      ? 'bg-amber-100 text-amber-900 font-bold hover:bg-amber-200'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>{item.day}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Scelte Rapide */}
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-2xs">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange(todayStr);
                  setIsOpen(false);
                }}
                className="px-2 py-1 rounded-md bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                Oggi
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(yesterdayStr);
                  setIsOpen(false);
                }}
                className="px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold cursor-pointer"
              >
                Ieri
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(getDaysAgoString(7));
                  setIsOpen(false);
                }}
                className="px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold cursor-pointer"
                title="7 giorni fa"
              >
                -7 gg
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-700 font-medium px-2 py-1 cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
