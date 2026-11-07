import React from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface DeviceModeSelectorProps {
  currentMode: DeviceMode;
  onChangeMode: (mode: DeviceMode) => void;
  className?: string;
  compact?: boolean;
}

export const DeviceModeSelector: React.FC<DeviceModeSelectorProps> = ({
  currentMode,
  onChangeMode,
  className = '',
  compact = false
}) => {
  return (
    <div className={`inline-flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-700/80 shadow-xs ${className}`}>
      {/* Opzione Telefono */}
      <button
        type="button"
        id="device-mode-mobile"
        onClick={() => onChangeMode('mobile')}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          currentMode === 'mobile'
            ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
        }`}
        title="Vista Telefono"
      >
        <Smartphone className="w-3.5 h-3.5" />
        {!compact && <span>Telefono</span>}
      </button>

      {/* Opzione Tablet */}
      <button
        type="button"
        id="device-mode-tablet"
        onClick={() => onChangeMode('tablet')}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          currentMode === 'tablet'
            ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
        }`}
        title="Vista Tablet"
      >
        <Tablet className="w-3.5 h-3.5" />
        {!compact && <span>Tablet</span>}
      </button>

      {/* Opzione Desktop */}
      <button
        type="button"
        id="device-mode-desktop"
        onClick={() => onChangeMode('desktop')}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          currentMode === 'desktop'
            ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
        }`}
        title="Vista Desktop"
      >
        <Monitor className="w-3.5 h-3.5" />
        {!compact && <span>Desktop</span>}
      </button>
    </div>
  );
};
